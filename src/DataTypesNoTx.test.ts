import {
  AccountUpdate,
  Field,
  isReady,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
} from 'snarkyjs';
import { DataTypes } from './DataTypes';
import { CircuitDynamicArray } from './dynamicArray';

const prove = false;

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function localDeploy(
  zkAppInstance: DataTypes,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.sign(zkAppPrivatekey);
  });
  await txn.send();
}

describe('DataTypes', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppInstance: DataTypes;

  beforeAll(async () => {
    await isReady;
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new DataTypes(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    if (prove) await DataTypes.compile();
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  it('should be able to get an item from the dynamic array', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const arr = CircuitDynamicArray.fromFields(values);
    arr.get(Field.one).assertEquals(Field.one);
  });

  it('should be able to set an item in the dynamic array', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const newArray = [0, 3, 2].map((x) => Field(x));
    const newArrayHash = CircuitDynamicArray.fromFields(newArray).hash();
    const arr = CircuitDynamicArray.fromFields(values);

    arr.set(Field.one, Field(3));
    arr.hash().assertEquals(newArrayHash);
  });

  it('should be able to push an item to the dynamic array', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const newArray = [0, 1, 2, 3].map((x) => Field(x));
    const newArrayHash = CircuitDynamicArray.fromFields(newArray).hash();
    const arr = CircuitDynamicArray.fromFields(values);

    arr.push(Field(3));
    arr.hash().assertEquals(newArrayHash);
  });

  it('should be able to remove the last item of the dynamic array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));
    const newArray = [0, 1].map((x) => Field(x));
    const newArrayHash = CircuitDynamicArray.fromFields(newArray).hash();
    const arr = CircuitDynamicArray.fromFields(values);

    arr.pop(Field(2));
    arr.hash().assertEquals(newArrayHash);
  });

  it('should be able to make a copy of a dynamic array', async () => {
    const arr = CircuitDynamicArray.fromFields([1, 2, 3].map((x) => Field(x)));
    const copy = arr.copy();

    arr.set(Field(1), Field(4));
    copy.set(Field(2), Field(5));

    arr.get(Field(2)).assertEquals(Field(3));
    copy.get(Field(1)).assertEquals(Field(2));
  });

  it('should be able to concat two dynamic arrays', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const otherValues = [3, 4, 5].map((x) => Field(x));
    const newArray = [0, 1, 2, 3, 4, 5].map((x) => Field(x));
    const newArrayHash = CircuitDynamicArray.fromFields(newArray).hash();
    const arr = CircuitDynamicArray.fromFields(values);
    const other = CircuitDynamicArray.fromFields(otherValues);

    const newArr = arr.concat(other);
    newArr.hash().assertEquals(newArrayHash);
    newArr.insert(Field(0), Field(9));
  });

  it('should be able to insert item into the dynamic array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));
    const newArray = [0, 1, 9, 2, 3].map((x) => Field(x));
    const newArrayHash = CircuitDynamicArray.fromFields(newArray).hash();
    const arr = CircuitDynamicArray.fromFields(values);

    arr.insert(Field(2), Field(9));
    arr.hash().assertEquals(newArrayHash);
  });

  it('should be able to assert whether an item exists inside of an array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));
    const arr = CircuitDynamicArray.fromFields(values);

    arr.assertExists(Field(2));
  });
});
