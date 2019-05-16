// thin wrapper around ethereumjs-wallet

let EthereumJSWallet = require('ethereumjs-wallet');
let EthUtil = require('ethereumjs-util');
//to do - make these web workers and deal with the complexity/security aspect

let complexity = 1; //9 is used in geth but it takes ages!

class Wallet {

    /**
     * Generate new wallet 
     * @param {string} password to use when generating wallet
     * @returns {Wallet} new wallet
     */
    generate(password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.wallet = EthereumJSWallet.generate();
                this.walletV3 = this.wallet.toV3(password, {
                    kdf: 'scrypt',
                    dklen: 32,
                    n: Math.pow(complexity, 2),
                    r: 8,
                    p: 1,
                    cipher: 'aes-128-ctr'
                });
                resolve(this);
            });
        });
    }

    /**
     * Create wallet from json string 
     * @param {string} walletJSON string
     * @param {string} password to use
     * @returns {Wallet} wallet
     */
    fromJSON(walletJSON, password) {
        return new Promise((resolve, reject) => {
            //console.time("decryptWallet");
            try {
                var wallet = EthereumJSWallet.fromV3(walletJSON, password, true);
                //console.timeEnd("decryptWallet");
                resolve(wallet);
            }
            catch (err) {
                //console.timeEnd("decryptWallet");
                if (err.message === "Key derivation failed - possibly wrong passphrase") {
                    reject(false);
                } else {
                    throw new Error(err);
                }
            }
        });
    }

    /**
     * Create wallet from json string 
     * @param {string} walletJSON string
     * @param {string} password to use
     * @returns {Wallet} wallet
     */
    encrypt(privateKey, password) {
        return new Promise((resolve, reject) => {
            //console.time("encryptWallet");
            const wallet = EthereumJSWallet.fromPrivateKey(EthUtil.toBuffer("0x"+privateKey));            
            try {
                let walletV3 = wallet.toV3(password, {
                    kdf: 'scrypt',
                    dklen: 32,
                    n: Math.pow(complexity, 2),
                    r: 8,
                    p: 1,
                    cipher: 'aes-128-ctr'
                });
                var walletJSON = JSON.stringify(walletV3);
                resolve(walletJSON);
            }
            catch (err) {
                //console.timeEnd("encryptWallet");
                throw new Error(err);
            }
        });
    }    

}

module.exports = Wallet;