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
import { DynamicArray } from './dynamicArray';

const prove = false;

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled: prove });
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
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.get(values, Field(1), Field(1));
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to set an item in the dynamic array', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const newArray = [0, 3, 2].map((x) => Field(x));
    const newArrayHash = DynamicArray(Field, 8).from(newArray).hash();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(values, Field(1), Field(3), newArrayHash);
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to push an item to the dynamic array', async () => {
    const values = [0, 1, 2].map((x) => Field(x));
    const newArray = [0, 1, 2, 3].map((x) => Field(x));
    const newArrayHash = DynamicArray(Field, 8).from(newArray).hash();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.push(values, Field(3), newArrayHash);
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to remove the last item of the dynamic array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));
    const newArray = [0, 1].map((x) => Field(x));
    const newArrayHash = DynamicArray(Field, 8).from(newArray).hash();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.pop(values, Field(2), newArrayHash);
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to make a copy of a dynamic array', async () => {
    const arr = DynamicArray(Field, 8).from([1, 2, 3].map((x) => Field(x)));
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
    const newArrayHash = DynamicArray(Field, 8).from(newArray).hash();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.concat(values, otherValues, newArrayHash);
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to insert item into the dynamic array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));
    const newArray = [0, 1, 9, 2, 3].map((x) => Field(x));
    const newArrayHash = DynamicArray(Field, 8).from(newArray).hash();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.insert(values, Field(2), Field(9), newArrayHash);
    });
    await txn.prove();
    await txn.send();
  });

  it('should be able to assert whether an item exists inside of an array', async () => {
    const values = [0, 1, 2, 3].map((x) => Field(x));

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.exists(values, Field(2));
    });
    await txn.prove();
    await txn.send();
  });
});
