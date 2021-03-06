import { Tag, TagInfo, TagTransceiveFn } from 'RFIDService/Tag';
import { Log } from 'Utils/Log';
import * as crypto from 'crypto';
import { KeyProvider } from 'RFIDService/KeyProvider';
import { DesfireKey, DesfireKeyAES, DesfireKey2K3DES, DesfireKey2K3DESDefault, DesfireKey3K3DES } from './DesfireKey';

// Unique desfire AID used in select file ISO7816-4 instruction
const DESFIRE_AID = Buffer.from('D2760000850100', 'hex');

// Status codes
const DF_STATUS_OPERATION_OK = 0x00;
const DF_STATUS_ADDITIONAL_FRAME = 0xAF;

// Instructions
const DF_INS_ADDITIONAL_FRAME = 0xAF;
const DF_INS_CHANGE_KEY = 0xC4;

function RotateBuffer(buf: Buffer)
{
    return Buffer.concat([buf.slice(1), buf.slice(0, 1)]);
}

function getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class DesfireTag extends Tag
{
    Connected: boolean = false;
    AuthenticatedKeyNo: number = -1;
    SessionKey: DesfireKey = new DesfireKey2K3DESDefault();
    SelectedApplication: number = 0;

    static Identify(info: TagInfo)
    {
        // Desfire footprint
        if (info.ATQA[0] == 0x03 && info.ATQA[1] == 0x44 && info.SAK == 0x20 && !(Buffer.from("7577810280", 'hex').compare(info.ATS)))
            return true;
        else
            return false;
    }

    async DesfireTransceive(instruction: number, data: Buffer, CLA?: number, P1?: number, P2?: number)
    {
        // Build ISO7816_4_CAPDU packet
        var buf = Buffer.alloc(6+data.length);
        buf.writeUInt8(CLA !== undefined ? CLA : 0x90, 0); // CLA
        buf.writeUInt8(instruction, 1); // INS
        buf.writeUInt8(P1 !== undefined ? P1 : 0x00, 2); // P1
        buf.writeUInt8(P2 !== undefined ? P2 : 0x00, 3); // P2
        buf.writeUInt8(data.length, 4); // Lc
        data.copy(buf, 5); // Data
        buf.writeUInt8(0x00, 5+data.length); // Le

        Log.verbose("DesfireTag::DesfireTransceive(): Sent", buf.toString('hex'));

        // Transceive with card
        buf = await this.Transceive(buf);

        Log.verbose("DesfireTag::DesfireTransceive(): Received", buf.toString('hex'));

        if (buf.length < 2)
            throw new Error("DesfireTag::DesfireTransceive(): Wrong response size");

        // Parse ISO7816_4_RAPDU packet
        var data = buf.slice(0, buf.length-2);
        var SW1 = buf.readUInt8(buf.length-2);
        var SW2 = buf.readUInt8(buf.length-1);

        if (SW2 != DF_STATUS_OPERATION_OK && SW2 != DF_STATUS_ADDITIONAL_FRAME)
            throw new Error("DesfireTag::DesfireTransceive(): Bad response status code " + SW2);
        
        return data;
    }

    // Should (theoretically must) be called before issuing any desfire commands
    async Connect()
    {
        try {
            // INS 0xA4 SELECT_FILE
            // CLA 0x00 ISO7816_4_CLA_WITHOUT_SM_LAST
            // P1 0x04
            await this.DesfireTransceive(0xA4, DESFIRE_AID, 0x00, 0x04);
        } catch (e) {
            Log.debug("DesfireTag::Connect(): Transceive failed", {e});
            console.log(e);
            this.Connected = false;
            return false;
        }

        Log.debug("DesfireTag::Connect(): Connected.");

        this.Connected = true;
        return true;
    }

    async DesfireAuthenticate(key: DesfireKey, keyno: number = 0)
    {
        // Reset IV
        key.ResetIV();

        // Make sure tag is connected
        if (!this.Connected)
            if (!await this.Connect())
                return false;
    
        // write keyno as payload
        let AuthBuf = Buffer.alloc(1);
        AuthBuf.writeUInt8(keyno, 0);

        // Initiate auth with tag and receive RndB (encrypted)
        try {
            var RndBEnc = await this.DesfireTransceive(key.GetAuthCmd(), AuthBuf);
        } catch (e) {
            Log.error("DesfireTag::Authenticate(): Authentication request failed", {e});
            return false;
        }

        // Decrypt RndB
        const RndB = key.Decrypt(RndBEnc);

        // Rotate RndB
        const RndBRot = RotateBuffer(RndB);

        // Generate RndA
        let RndA = new Buffer(RndB.length);
        for (var i = 0; i < RndA.length; ++i)
            RndA[i] = getRandomIntInclusive(0, 255);
        
        // Build authentication token
        let Token = Buffer.alloc(RndBRot.length + RndA.length);
        RndA.copy(Token, 0);
        RndBRot.copy(Token, RndA.length);

        // Encrypt authentication token
        const TokenEnc = key.Encrypt(Token);

        // Continue auth by sending token and receiving RndARot (encrypted)
        try {
            var RndARotEnc = await this.DesfireTransceive(DF_INS_ADDITIONAL_FRAME, TokenEnc);
        } catch (e) {
            Log.error("DesfireTag::Authenticate(): Authentication with token failed", {e});
            return false;
        }

        // Decrypt RndARot
        const RndARot = key.Decrypt(RndARotEnc);

        // Build local RndARot
        const RndARotLocal = RotateBuffer(RndA);

        // Check if buffers match
        if (!RndARot.compare(RndARotLocal))
        {
            this.AuthenticatedKeyNo = keyno;
            this.SessionKey = key.GetSessionKey(RndA, RndB);
            Log.debug("DesfireTag::Authenticate(): Created session key", {
                RndA: RndA.toString('hex'),
                RndB: RndB.toString('hex'),
                SessionKey: this.SessionKey.Get().toString('hex'),
            });

            return true;
        }
        else
        {
            Log.error("DesfireTag::Authenticate(): Buffers did not match", {
                RndARot: RndARot.toString('hex'),
                RndARotLocal: RndARotLocal.toString('hex')
            });
            this.AuthenticatedKeyNo = -1;

            return false;
        }
    }

    async ChangeKey(keyno: number, key: DesfireKey)
    {
        keyno &= 0x0F;

        if (this.AuthenticatedKeyNo != keyno)
        {
            Log.error("DesfireTag::ChnageKey(): Authenticated key no does not match", {
                authKeyno: this.AuthenticatedKeyNo,
                keyno: keyno
            });

            return false;
        }

        // Key type can only be changed on master key
        if (this.SelectedApplication == 0)
        {
            if (key instanceof DesfireKeyAES)
                keyno |= 0x80;
        }

        let cryptogram = Buffer.alloc(200);
        let i = 0;

        // Append key. DES keys are appened twice
        i += key.Get().copy(cryptogram, i);

        // Aes key has version
        if (key instanceof DesfireKeyAES)
            i = cryptogram.writeUInt8(key.Version(), i);

        // Calculate CRC
        let crc = 0xFFFFFFFF;
        crc = DesfireTag.DesfireCRC(crc, DF_INS_CHANGE_KEY);
        crc = DesfireTag.DesfireCRC(crc, keyno);

        for (let x = 0; x < i; ++x)
            crc = DesfireTag.DesfireCRC(crc, cryptogram[x]);

        i = cryptogram.writeInt32LE(crc, i);

        // Pad to key length blocks
        while (i % key.BlockLength() != 0)
            i = cryptogram.writeUInt8(0x00, i);

        // Encrypt
        const cryptogramEnc = this.SessionKey.Encrypt(cryptogram.slice(0, i));

        let buf = Buffer.alloc(i+1);
        buf.writeUInt8(keyno, 0);
        cryptogramEnc.copy(buf, 1);

        try {
            await this.DesfireTransceive(DF_INS_CHANGE_KEY, buf);
        } catch (e) {
            Log.error("DesfireTag::ChangeKey(): Failed", {e});
            return false;
        }

        return true;
    }

    async Authenticate(keyProvider: KeyProvider): Promise<boolean>
    {
        // Use TagInfo as diversification input (ugly conversion in JS)
        let OtherInfo = Buffer.alloc(2 + 1 + this.info.UID.length + this.info.ATS.length);
        OtherInfo.writeUInt8(this.info.ATQA[0], 0);
        OtherInfo.writeUInt8(this.info.ATQA[1], 1);
        OtherInfo.writeUInt8(this.info.SAK, 2);
        this.info.UID.copy(OtherInfo, 4);
        this.info.ATS.copy(OtherInfo, 4 + this.info.UID.length);

        // Get 16 byte key (AES128) from keyProvider
        let key = new DesfireKeyAES(keyProvider.GetKey(16, OtherInfo));
        Log.debug("DesfireTag::Authenticate(): Generated key", {key: key.Get().toString('hex')});

        // Authenticate key 0
        if (await this.DesfireAuthenticate(key, 0))
            return true;
        
        // Try authenticating with default key and change it
        Log.debug("DesfireTag::Authenticate(): Trying to change default key");

        const defaultkey =  new DesfireKey2K3DESDefault();

        if (!await this.DesfireAuthenticate(defaultkey, 0))
            return false;

        if (!await this.ChangeKey(0, key))
            return false;

        return true;
    }

    static DesfireCRC(crc: number, value: number): number
    {
        // x32 + x26 + x23 + x22 + x16 + x12 + x11 + x10 + x8 + x7 + x5 + x4 + x2 + x + 1
        let poly = 0xEDB88320;

        crc ^= value;
        for (let current_bit = 7; current_bit >= 0; current_bit--)
        {
            let bit_out = crc & 0x00000001;
            crc >>>= 1;
            if (bit_out)
                crc ^= poly;
        }

        return crc;
    }
}

export default DesfireTag;
