import { AccountUpdate, isReady, Mina, PrivateKey, shutdown } from 'snarkyjs';
import { DataTypes } from './DataTypes.js';

await isReady;

const prove = true;

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

txn = await Mina.transaction(deployerAccount, () => {
  zkAppInstance.jsonTest();
});
console.log('prove');
await txn.prove();
await txn.send();

shutdown();

// JS implementations

function require(expr: boolean, msg: string) {
  if (!expr) {
    throw new Error(msg);
  }
}
function index(str: string, desiredIndex: number) {
  const arr = str.split('');
  require(arr[0] === '[', 'expected [');
  require(arr[arr.length - 1] === ']', 'expected ]');
  let index = -1;
  let newIndex = true;
  let depth = 0;
  let insideString = false;
  let start = 0;
  let end = 0;
  for (let i = 1; i < arr.length - 1; i++) {
    insideString =
      arr[i] === '"' && arr[i - 1] !== '\\' ? !insideString : insideString;
    depth =
      !insideString && (arr[i] === '[' || arr[i] === '{') ? depth + 1 : depth;
    depth =
      !insideString && (arr[i] === ']' || arr[i] === '}') ? depth - 1 : depth;
    index += newIndex ? 1 : 0;
    start += index === desiredIndex && newIndex ? i : 0;
    end += index === desiredIndex + 1 && newIndex ? i - 1 : 0;
    console.log(
      arr[i],
      i,
      index === desiredIndex,
      index,
      newIndex,
      insideString,
      depth,
      start,
      end
    );
    newIndex = arr[i] === ',' && depth === 0;
  }
  require(start !== 0 || end !== 0, 'out of bounds');
  end = end === 0 ? arr.length - 1 : end;
  console.log(start, end, str.substring(start, end));
}

function key(str: string, key: string) {
  const arr = str.split('');
  require(arr[0] === '{', 'expected {');
  require(arr[arr.length - 1] === '}', 'expected }');
  let depth = 0;
  let keyFound = false;
  let insideString = false;
  let keyStart = 0;
  let start = 0;
  let end = 0;
  for (let i = 1; i < arr.length - 1; i++) {
    const val = arr[i];
    depth =
      !insideString &&
      ((val === ':' && depth === 0) || val === '[' || val === '{')
        ? depth + 1
        : depth;
    depth =
      !insideString &&
      ((val === ',' && depth === 1) || val === ']' || val === '}')
        ? depth - 1
        : depth;
    keyStart = insideString && depth === 0 && keyStart === 0 ? i : keyStart;
    const keyEnd = insideString && depth === 0 && val === '"' ? i : 0;
    keyFound = keyEnd > 0 ? str.slice(keyStart, keyEnd) === key : keyFound;
    start = keyFound && !(val === ':') && depth > 0 && start == 0 ? i : start;
    end = keyFound && depth === 0 && start > 0 && end === 0 ? i : end;
    keyStart = keyEnd > 0 ? 0 : keyStart;
    insideString =
      val === '"' && arr[i - 1] !== '\\' ? !insideString : insideString;
  }
  require(start !== 0 || end !== 0, 'key not found');
  end = end === 0 ? arr.length - 1 : end;
  console.log(start, end, str.substring(start, end));
}
