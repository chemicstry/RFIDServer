import 'mocha';
import { expect } from 'chai';
import { HKDF } from './KeyProvider';

describe('HKDF KeyProvider', () => {
    it('Should provide valid OKM', () => {
        // Data provided by https://tools.ietf.org/html/rfc5869
        let IKM = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
        let salt = Buffer.from('000102030405060708090a0b0c', 'hex');
        let info = Buffer.from('f0f1f2f3f4f5f6f7f8f9', 'hex');
        let OKM = Buffer.from('3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865', 'hex');

        let hkdf = new HKDF(IKM, 'sha256', salt);
        let result = hkdf.GetKey(OKM.length, info);

        expect(result).to.deep.equal(OKM);
    });
});
