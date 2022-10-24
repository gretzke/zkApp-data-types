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
const txn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
});
await txn.send();

console.log('get()');

const MyArray = DynamicArray(Field, 10);
const NestedArray = DynamicArray(MyArray, 10);

function arr(vals: number[]) {
  return MyArray.from(vals.map((x) => Field(x)));
}

const array = NestedArray.empty();
array.push(arr([1, 2, 3]));
array.push(arr([4, 5, 6]));
console.log('setup', array.toString());
const res = array.get(Field(1));
console.log('get', res.toString());
array.set(Field(1), arr([7, 8, 9, 10]));
console.log('set', array.toString());
array.push(arr([8]));
console.log('push', array.toString());
array.pop(Field(1));
console.log('pop', array.toString());
const newArr = array.concat(NestedArray.from([arr([9, 8, 7]), arr([6, 5, 4])]));
console.log('concat', newArr.toString());
console.log('insert before', array.toString());
array.insert(Field(1), arr([4, 5, 6]));
console.log('insert after', array.toString());
array.assertExists(arr([7, 8, 9, 10]));

// const values = [1, 2, 3, 4, 5, 6].map((x) => new UInt64(x));
// const other = DynamicArray(UInt64, 10).from(
//   [1, 2, 3].map((x) => new UInt64(x))
// );
// const array = DynamicArray(UInt64, 10).from(values);

// txn = await Mina.transaction(deployerAccount, () => {
//   // console.log(array.toString());
//   zkAppInstance.get(array, Field(1), Field(2));
// });
// console.log('prove');
// await txn.prove();
// await txn.send();

shutdown();
