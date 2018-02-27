import * as crypto from 'crypto';

// Provides arbitraty length diversified keys based on diversification data (OtherInfo)
interface KeyProvider
{
    GetKey(keydatalen: number, OtherInfo: Buffer): Buffer;
}

class ConstantKeyProvider implements KeyProvider
{
    key: Buffer;

    constructor(key: Buffer)
    {
        this.key = key;
    }

    GetKey(keydatalen: number, OtherInfo: Buffer): Buffer
    {
        return this.key;
    }
}

// Implements Single-step KDF based on NIST SP 800-56A Rev. 2 specification (chapter 5.8.1)
class SingleStepKDF implements KeyProvider
{
    Z: Buffer;
    hashalgo: string;
    hashlen: number;

    constructor(Z: Buffer, hashalgo: string = "sha256")
    {
        // set secret Z (master key)
        this.Z = Z;

        // Hashing algorithm
        this.hashalgo = hashalgo;

        // Hashing algorithm length
        this.hashlen = crypto.createHash(this.hashalgo).digest().length;
    }

    GetKey(keydatalen: number, OtherInfo: Buffer): Buffer
    {
        let reps = keydatalen / this.hashlen;

        let K = Buffer.alloc(Math.ceil(reps)*this.hashlen);

        for (var counter = 1; counter <= reps; ++counter)
        {
            // uint32 counter + Z + Otherinfo
            let buf = Buffer.alloc(4 + this.Z.length + OtherInfo.length);

            // Build hash data
            buf.writeUInt32BE(counter, 0);
            this.Z.copy(buf, 4);
            OtherInfo.copy(buf, 4 + this.Z.length);

            // Calculate hash
            let hash = crypto.createHash(this.hashalgo);
            hash.update(buf);
            hash.digest().copy(K, (counter-1)*this.hashlen);
        }

        // Truncate if reps was non integer
        return K.slice(0, keydatalen);
    }
}

// Defined in RFC5869 https://tools.ietf.org/html/rfc5869
class HKDF implements KeyProvider
{
    IKM: Buffer;
    PRK: Buffer;
    hashalgo: string;
    hashlen: number;
    salt: Buffer;

    constructor(IKM: Buffer, hashalgo: string, salt: Buffer)
    {
        // Initial keying material (master key)
        this.IKM = IKM;

        // Hashing algorithm
        this.hashalgo = hashalgo;

        // Hashing algorithm length
        this.hashlen = crypto.createHash(this.hashalgo).digest().length;

        // Salt
        this.salt = salt || this.Zeros(this.hashlen);

        // Erkact primary keying material (PRK)
        this.PRK = this.Extract();
    }

    Zeros(len: number): Buffer
    {
        var buf = Buffer.alloc(len);
        buf.fill(0);
        return buf;
    }

    Extract(): Buffer
    {
        let hmac = crypto.createHmac(this.hashalgo, this.salt);
        hmac.update(this.IKM);
        return hmac.digest();
    }

    Expand(info: Buffer, size: number): Buffer
    {
        let prev = Buffer.alloc(0);
        let buffers = [];

        // Get number of blocks to expand
        let blocks = Math.ceil(size / this.hashlen);

        for (let i = 0; i < blocks; ++i)
        {
            let hmac = crypto.createHmac(this.hashalgo, this.PRK);
            hmac.update(prev);
            hmac.update(info);
            hmac.update(Buffer.from(String.fromCharCode(i + 1)));
            prev = hmac.digest();
            buffers.push(prev);
        }

        return Buffer.concat(buffers, size);
    }

    GetKey(keydatalen: number, OtherInfo: Buffer): Buffer
    {
        return this.Expand(OtherInfo, keydatalen);
    }
}

export {
    KeyProvider,
    ConstantKeyProvider,
    SingleStepKDF,
    HKDF
};
