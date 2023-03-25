const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;

const secp = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { toHex } = require("ethereum-cryptography/utils");
let addressToNonceServer = {};
app.use(cors());
app.use(express.json());

const balances = {
    //  Private Key 04a2bb46470bccc5fdad85a6833ef9aff8fe082ae53fbe46ce6db2e1009e4fef
    "009b81a6f8ecfdd8f129": 100,
    // Private Key 5fc7e16319f7a76041d1f0189da88e9862e9605979e37aed7102a8a8d7ac60ea
    "b61a62bba6f627e46ebb": 50,
    // Private Key 7601da2972c9940dbf153c79470a81b655c58e6346f7de129a4ff97525336c36
    "b514c696fe3284bccf81": 75,
};

app.get("/balance/:address", (req, res) => {
    const { address } = req.params;
    const balance = balances[address] || 0;
    res.send({ balance });
});

app.get("/accounts", (req, res) => {
    const accounts = [
        {
            privateKey:
                " 04a2bb46470bccc5fdad85a6833ef9aff8fe082ae53fbe46ce6db2e1009e4fef",
        },
        {
            privateKey:
                " 5fc7e16319f7a76041d1f0189da88e9862e9605979e37aed7102a8a8d7ac60ea",
        },
        {
            privateKey:
                " 7601da2972c9940dbf153c79470a81b655c58e6346f7de129a4ff97525336c36",
        },
    ];
    Object.entries(balances).forEach(([address, balance], index) => {
        accounts[index] = {
            ...accounts[index],
            address: address,
            balance: balance,
        };
    });
    res.json(accounts);
});

app.post("/send", (req, res) => {
    const { signature, recoveryBit, amount, recipient, nextNonce } = req.body;
    const uint8ArrayMsg = Uint8Array.from([amount, recipient]);
    const messageHash = toHex(uint8ArrayMsg);

    // recover public key from signature

    const publicKey = secp.recoverPublicKey(
        messageHash,
        signature,
        recoveryBit
    );

    // hash public key to get address
    const publicKeyHash = toHex(keccak256(publicKey));
    // console.log("Public key", publicKeyHash);
    const sender = `0x${publicKeyHash.slice(-20)}`; // 20 bytes address
    // console.log("Sender = ", sender);
    //Verification
    const isValidSign = secp.verify(signature, messageHash, toHex(publicKey));
    const doesAddressExists = !sender in addressToNonceServer;
    if (!doesAddressExists) {
        addressToNonceServer = { ...addressToNonceServer, [sender]: 0 };
    }
    let isNonceValid = nextNonce === addressToNonceServer[sender] + 1;
    setInitialBalance(sender);
    setInitialBalance(recipient);
    if (balances[sender] < amount) {
        res.status(400).send({ message: "Not enough funds!" });
    } else if (!isValidSign) {
        res.status(400).send({ message: "Invalid Signature" });
    } else if (!isNonceValid) {
        res.status(400).send({ message: "Invalid Nonce" });
    } else {
        balances[sender] -= amount;
        balances[recipient] += amount;
        addressToNonceServer = {
            ...addressToNonceServer,
            [sender]: addressToNonceServer[sender] + 1,
        };
        res.send({
            balance: balances[sender],
            sender: sender,
            nonceFromServer: addressToNonceServer[sender],
        });
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
    if (!balances[address]) {
        balances[address] = 0;
    }
}
