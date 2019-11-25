"use strict";

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { BytesLike, isHexString } from "@ethersproject/bytes";
import { Network } from "@ethersproject/networks";
import { Description, defineReadOnly } from "@ethersproject/properties";
import { Transaction } from "@ethersproject/transactions";
import { OnceBlockable } from "@ethersproject/web";

import { Logger } from "@ethersproject/logger";
import { version } from "./_version";
const logger = new Logger(version);

///////////////////////////////
// Exported Types


export type TransactionRequest = {
    to?: string | Promise<string>,
    from?: string | Promise<string>,
    nonce?: BigNumberish | Promise<BigNumberish>,

    gasLimit?: BigNumberish | Promise<BigNumberish>,
    gasPrice?: BigNumberish | Promise<BigNumberish>,

    data?: BytesLike | Promise<BytesLike>,
    value?: BigNumberish | Promise<BigNumberish>,
    chainId?: number | Promise<number>,
}

export interface TransactionResponse extends Transaction {
    hash: string;

    // Only if a transaction has been mined
    blockNumber?: number,
    blockHash?: string,
    timestamp?: number,

    confirmations: number,

    // Not optional (as it is in Transaction)
    from: string;

    // The raw transaction
    raw?: string,

    // This function waits until the transaction has been mined
    wait: (confirmations?: number) => Promise<TransactionReceipt>
};

export type BlockTag = string | number;

interface _Block {
    hash: string;
    parentHash: string;
    number: number;

    timestamp: number;
    nonce: string;
    difficulty: number;

    gasLimit: BigNumber;
    gasUsed: BigNumber;

    miner: string;
    extraData: string;
}

export interface Block extends _Block {
    transactions: Array<string>;
}

export interface BlockWithTransactions extends _Block {
    transactions: Array<TransactionResponse>;
}


export interface Log {
    blockNumber?: number;
    blockHash?: string;
    transactionIndex?: number;

    removed?: boolean;

    transactionLogIndex?: number,

    address: string;
    data: string;

    topics: Array<string>;

    transactionHash?: string;
    logIndex?: number;
}

export interface TransactionReceipt {
    to?: string;
    from?: string;
    contractAddress?: string,
    transactionIndex?: number,
    root?: string,
    gasUsed?: BigNumber,
    logsBloom?: string,
    blockHash?: string,
    transactionHash?: string,
    logs?: Array<Log>,
    blockNumber?: number,
    confirmations?: number,
    cumulativeGasUsed?: BigNumber,
    byzantium: boolean,
    status?: number
};

export interface EventFilter {
    address?: string;
    topics?: Array<string | Array<string>>;
}

export interface Filter extends EventFilter {
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
}

export interface FilterByBlockHash extends EventFilter {
    blockhash?: string;
}

//export type CallTransactionable = {
//    call(transaction: TransactionRequest): Promise<TransactionResponse>;
//};

export abstract class ForkEvent extends Description {
    readonly expiry: number;

    readonly _isForkEvent: boolean;

    static isForkEvent(value: any): value is ForkEvent {
        return !!(value && value._isForkEvent);
    }
}

export class BlockForkEvent extends ForkEvent {
    readonly blockhash: string;

    constructor(blockhash: string, expiry?: number) {
        if (!isHexString(blockhash, 32)) {
            logger.throwArgumentError("invalid blockhash", "blockhash", blockhash);
        }

        super({
            _isForkEvent: true,
            _isBlockForkEvent: true,
            expiry: (expiry || 0),
            blockHash: blockhash
        });
    }
}

export class TransactionForkEvent extends ForkEvent {
    readonly hash: string;

    constructor(hash: string, expiry?: number) {
        if (!isHexString(hash, 32)) {
            logger.throwArgumentError("invalid transaction hash", "hash", hash);
        }

        super({
            _isForkEvent: true,
            _isTransactionForkEvent: true,
            expiry: (expiry || 0),
            hash: hash
        });
    }
}

export class TransactionOrderForkEvent extends ForkEvent {
    readonly beforeHash: string;
    readonly afterHash: string;

    constructor(beforeHash: string, afterHash: string, expiry?: number) {
        if (!isHexString(beforeHash, 32)) {
            logger.throwArgumentError("invalid transaction hash", "beforeHash", beforeHash);
        }
        if (!isHexString(afterHash, 32)) {
            logger.throwArgumentError("invalid transaction hash", "afterHash", afterHash);
        }

        super({
            _isForkEvent: true,
            _isTransactionOrderForkEvent: true,
            expiry: (expiry || 0),
            beforeHash: beforeHash,
            afterHash: afterHash
        });
    }
}

export type EventType = string | Array<string | Array<string>> | EventFilter | ForkEvent;

export type Listener = (...args: Array<any>) => void;

///////////////////////////////
// Exported Abstracts

export abstract class Provider implements OnceBlockable {

    // Network
    abstract getNetwork(): Promise<Network>;

    // Latest State
    abstract getBlockNumber(): Promise<number>;
    abstract getGasPrice(): Promise<BigNumber>;

    // Account
    abstract getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    abstract getTransactionCount(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<number>;
    abstract getCode(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string> ;
    abstract getStorageAt(addressOrName: string | Promise<string>, position: BigNumberish | Promise<BigNumberish>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;

    // Execution
    abstract sendTransaction(signedTransaction: string | Promise<string>): Promise<TransactionResponse>;
    abstract call(transaction: TransactionRequest, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract estimateGas(transaction: TransactionRequest): Promise<BigNumber>;

    // Queries
    abstract getBlock(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>): Promise<Block>;
    abstract getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>): Promise<BlockWithTransactions>;
    abstract getTransaction(transactionHash: string): Promise<TransactionResponse>;
    abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;

    // Bloom-filter Queries
    abstract getLogs(filter: Filter): Promise<Array<Log>>;

    // ENS
    abstract resolveName(name: string | Promise<string>): Promise<string>;
    abstract lookupAddress(address: string | Promise<string>): Promise<string>;

    // Event Emitter (ish)
    abstract on(eventName: EventType, listener: Listener): Provider;
    abstract once(eventName: EventType, listener: Listener): Provider;
    abstract emit(eventName: EventType, ...args: Array<any>): boolean
    abstract listenerCount(eventName?: EventType): number;
    abstract listeners(eventName?: EventType): Array<Listener>;
    abstract off(eventName: EventType, listener?: Listener): Provider;
    abstract removeAllListeners(eventName?: EventType): Provider;

    // Alias for "on"
    addListener(eventName: EventType, listener: Listener): Provider {
        return this.on(eventName, listener);
    }

    // Alias for "off"
    removeListener(eventName: EventType, listener: Listener): Provider {
        return this.off(eventName, listener);
    }

    // @TODO: This *could* be implemented here, but would pull in events...
    abstract waitForTransaction(transactionHash: string, timeout?: number): Promise<TransactionReceipt>;

    readonly _isProvider: boolean;

    constructor() {
        logger.checkAbstract(new.target, Provider);
        defineReadOnly(this, "_isProvider", true);
    }

    static isProvider(value: any): value is Provider {
        return !!(value && value._isProvider);
    }

/*
    static getResolver(network: Network, callable: CallTransactionable, namehash: string): string {
        // No ENS...
        if (!network.ensAddress) {
            errors.throwError(
                "network does support ENS",
                errors.UNSUPPORTED_OPERATION,
                { operation: "ENS", network: network.name }
            );
        }

        // Not a namehash
        if (!isHexString(namehash, 32)) {
            errors.throwArgumentError("invalid name hash", "namehash", namehash);
        }

        // keccak256("resolver(bytes32)")
        let data = "0x0178b8bf" + namehash.substring(2);
        let transaction = { to: network.ensAddress, data: data };

        return provider.call(transaction).then((data) => {
            return provider.formatter.callAddress(data);
        });
    }

    static resolveNamehash(network: Network, callable: CallTransactionable, namehash: string): string {
        return this.getResolver(network, callable, namehash).then((resolverAddress) => {
            if (!resolverAddress) { return null; }

            // keccak256("addr(bytes32)")
            let data = "0x3b3b57de" + namehash(name).substring(2);
            let transaction = { to: resolverAddress, data: data };
            return callable.call(transaction).then((data) => {
                return this.formatter.callAddress(data);
            });

        })
    }
*/
}