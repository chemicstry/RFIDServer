import 'mocha';
import { expect } from 'chai';
import { DesfireKey, DesfireKeyAES, DesfireKey2K3DES, DesfireKey3K3DES, DesfireKey2K3DESDefault } from './DesfireKey';

describe('DesfireKeyAES', () => {
    it('Should encrypt correctly', () => {
        let key = new DesfireKeyAES(Buffer.from('3034dde848b8eea59c8f207f070ad021', 'hex'));
        let plaintext = Buffer.from('b1b1058fd13e8422aa0770bfeec0d93d', 'hex');
        let ciphertext = key.Encrypt(plaintext);
        expect(ciphertext).to.deep.equal(Buffer.from('d80e701906ff4b875ad4e9edc6b805e4', 'hex'));
    })

    it('Should decrypt correctly', () => {
        let key = new DesfireKeyAES(Buffer.from('3034dde848b8eea59c8f207f070ad021', 'hex'));
        let ciphertext = Buffer.from('b1b1058fd13e8422aa0770bfeec0d93d', 'hex');
        let plaintext = key.Decrypt(ciphertext);
        expect(plaintext).to.deep.equal(Buffer.from('1d8595be2cb30a0934d97ed5f554a03d', 'hex'));
    });

    it('Should provide a valid session key', () => {
        let RndA = Buffer.from('a5b687a14330211738639bd6167034e2', 'hex');
        let RndB = Buffer.from('17f74023a33afe2cac297f77dc826b0f', 'hex');
        let SessionKey = (new DesfireKeyAES).GetSessionKey(RndA, RndB).Get();
        expect(SessionKey).to.deep.equal(Buffer.from('a5b687a117f74023167034e2dc826b0f', 'hex'));
    });
});

describe('DesfireKey2K3DES', () => {
    it('Should encrypt correctly', () => {
        let key = new DesfireKey2K3DES(Buffer.from('3034dde848b8eea59c8f207f070ad021', 'hex'));
        let plaintext = Buffer.from('b1b1058fd13e8422aa0770bfeec0d93d', 'hex');
        let ciphertext = key.Encrypt(plaintext);
        expect(ciphertext).to.deep.equal(Buffer.from('55d944c90198beb5d4b989f2d02cc6b1', 'hex'));
    })

    it('Should decrypt correctly', () => {
        let key = new DesfireKey2K3DES(Buffer.from('3034dde848b8eea59c8f207f070ad021', 'hex'));
        let ciphertext = Buffer.from('b1b1058fd13e8422aa0770bfeec0d93d', 'hex');
        let plaintext = key.Decrypt(ciphertext);
        expect(plaintext).to.deep.equal(Buffer.from('3ecad433f70c56c7a3fc5ffe0b585698', 'hex'));
    });

    it('Should provide a valid session key', () => {
        let RndA = Buffer.from('a5b687a143302117', 'hex');
        let RndB = Buffer.from('17f74023a33afe2c', 'hex');
        let SessionKey = (new DesfireKey2K3DES).GetSessionKey(RndA, RndB).Get();
        expect(SessionKey).to.deep.equal(Buffer.from('a5b687a117f7402343302117a33afe2c', 'hex'));
    });
});

describe('DesfireKey2K3DESDefault', () => {
    it('Should provide a valid session key', () => {
        let RndA = Buffer.from('a5b687a143302117', 'hex');
        let RndB = Buffer.from('17f74023a33afe2c', 'hex');
        let SessionKey = (new DesfireKey2K3DESDefault).GetSessionKey(RndA, RndB).Get();
        expect(SessionKey).to.deep.equal(Buffer.from('a5b687a117f74023a5b687a117f74023', 'hex'));
    });
});
