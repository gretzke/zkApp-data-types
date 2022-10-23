import {
  AccountUpdate,
  Field,
  isReady,
  Mina,
  PrivateKey,
  shutdown,
} from 'snarkyjs';
import { DataTypes } from './DataTypes.js';
import { DynamicArray } from './dynamicArray.js';

await isReady;

const prove = false;

const Local = Mina.LocalBlockchain({ proofsEnabled: prove });
Mina.setActiveInstance(Local);
const deployerAccount = Local.testAccounts[0].privateKey;

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new DataTypes(zkAppAddress);

console.log('compile');
if (prove) await DataTypes.compile();

console.log('deploy');
let txn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
});
await txn.send();

console.log('get()');
const values = [1, 2, 3, 4, 5, 6].map((x) => Field(x));
txn = await Mina.transaction(deployerAccount, () => {
  zkAppInstance.get(values, Field(1), Field(2));
});
console.log('prove');
await txn.prove();
await txn.send();

shutdown();
