import * as crypto from 'crypto';
import { Log } from 'Utils/Log';

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

        Log.info("SingleStepKDF::constructor(): Initialized", {
            hashalgo: hashalgo,
            hashlen: this.hashlen
        });
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

// This method is described in NXP AN10922 and NIST SP 800-108
class CMACKDF implements KeyProvider
{
    constructor()
    {
        
    }

    GetKey(keydatalen: number, OtherInfo: Buffer): Buffer
    {
        return Buffer.alloc(keydatalen);
    }
}

export {
    KeyProvider,
    ConstantKeyProvider,
    SingleStepKDF,
    CMACKDF
};
