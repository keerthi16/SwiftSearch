import {
    apiBridgeCmds,
    CallbackPayload,
    PostDataFromSFE,
    PostErrorCallback,
    PostSuccessCallback,
    SSAPIBridgeInterface,
} from './interface/interface';
import { log } from './log/log';
import { logLevels } from './log/logLevels';
import Search from './search';
import SearchUtils from './utils/searchUtils';

let SwiftSearchAPI: any;

const makePayload = (data: PostSuccessCallback | PostErrorCallback): CallbackPayload => {
    return {
        message: data,
        method: apiBridgeCmds.swiftSearch,
    };
};

const WHITELIST = [
    apiBridgeCmds.initialSearch,
    apiBridgeCmds.checkDiskSpace,
    apiBridgeCmds.checkDiskSpaceCallBack,
].reduce((acc, curr) => {
    acc[ curr ] = true;

    return acc;
}, {});

class SSAPIBridge implements SSAPIBridgeInterface {
    private static isLibInit(): boolean {
        return SwiftSearchAPI && SwiftSearchAPI.isLibInit();
    }

    private static initSearch(data: any): void {
        const { userId, key } = data;
        SwiftSearchAPI = new Search(userId, key);
    }

    public indexBatchCallback = ((requestId: number, status: boolean, data: string) => {
        (process as any).send(
            makePayload({ requestId, method: apiBridgeCmds.indexBatchCallback, response: { status, data }}));
    });

    public getLatestTimestampCallback = ((requestId: number, status: boolean, timestamp: string) => {
        (process as any).send(
            makePayload({ requestId, method: apiBridgeCmds.getLatestTimestampCallback, response: { status, timestamp }}));
    });

    public searchCallback = ((requestId: number, data: any): void => {
        (process as any).send(makePayload({ requestId, method: apiBridgeCmds.searchCallback, response:  data }));
    });

    private SearchUtils: SearchUtils;

    constructor() {
        log.send(logLevels.INFO, 'Swift-Search Api Bridge Created');
        this.SearchUtils = new SearchUtils();
        this.handleMessageEvents = this.handleMessageEvents.bind(this);
        (process as any).on('message', this.handleMessageEvents);
    }

    public handleMessageEvents(data: any): void {
        const { method, message } = data;

        log.send(logLevels.INFO, !WHITELIST[method]);
        log.send(logLevels.INFO, !SSAPIBridge.isLibInit());
        if (!SSAPIBridge.isLibInit() && !WHITELIST[method]) {
            return;
        }

        log.send(logLevels.INFO, 'Should defenentntnt Log');

        switch (method) {
            case apiBridgeCmds.initialSearch:
                SSAPIBridge.initSearch(message);
                break;
            case apiBridgeCmds.getLatestTimestamp:
                this.getLatestTimestamp(data);
                break;
            case apiBridgeCmds.indexBatch:
                this.indexBatch(data);
                break;
            case apiBridgeCmds.search:
                this.searchQuery(data);
                break;
            case apiBridgeCmds.checkDiskSpace:
                this.checkDiskSpace(data);
                break;
            case apiBridgeCmds.getSearchUserConfig:
                this.getSearchUserConfig(data);
                break;
            case apiBridgeCmds.encryptIndex:
                this.encryptIndex(data);
                break;
            case apiBridgeCmds.updateUserConfig:
                this.updateUserConfig(data);
                break;
            case apiBridgeCmds.realTimeIndex:
                this.realTimeIndex(data);
                break;
            case apiBridgeCmds.deleteRealTimeIndex:
                this.deleteRealTimeFolder();
                break;
            default:
                break;
        }
    }

    public checkDiskSpace(data: PostDataFromSFE) {
        const { requestId } = data;
        this.SearchUtils.checkFreeSpace()
            .then((res: boolean) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.checkDiskSpaceCallBack, response: res}));
            })
            .catch((err) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.checkDiskSpaceCallBack, error: err}));
            });
    }

    public getSearchUserConfig(data: PostDataFromSFE) {
        const { requestId, message } = data;
        this.SearchUtils.getSearchUserConfig(message.userId)
            .then((res: any) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.getSearchUserConfigCallback, response: res}));
            })
            .catch((err) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.getSearchUserConfigCallback, error: err}));
            });
    }

    public updateUserConfig(data: PostDataFromSFE) {
        const { requestId, message } = data;
        this.SearchUtils.updateUserConfig(message.userId, message.userData)
            .then((res: any) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.updateUserConfigCallback, response: res}));
            })
            .catch((err) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.updateUserConfigCallback, error: err}));
            });
    }

    public indexBatch(data: PostDataFromSFE): void {
        const { message, requestId } = data;
        SwiftSearchAPI.indexBatch(message, this.indexBatchCallback.bind(this, requestId));
    }

    public realTimeIndex(data: PostDataFromSFE): void {
        const { message } = data;
        SwiftSearchAPI.batchRealTimeIndexing(message);
    }

    public getLatestTimestamp(data: PostDataFromSFE): void {
        const { requestId } = data;
        SwiftSearchAPI.getLatestMessageTimestamp(this.getLatestTimestampCallback.bind(this, requestId));
    }

    public deleteRealTimeFolder(): void {
        SwiftSearchAPI.deleteRealTimeFolder();
    }

    public encryptIndex(data: PostDataFromSFE): void {
        const { requestId, message } = data;
        SwiftSearchAPI.encryptIndex(message)
            .then(() => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.encryptIndexCallback, response: true}));
            })
            .catch((e: any) => {
                (process as any).send(
                    makePayload({ requestId, method: apiBridgeCmds.encryptIndexCallback, error: e}));
            });
    }

    public searchQuery(data: PostDataFromSFE): void {
        const { requestId, message } = data;
        const { q,
            senderId,
            threadId,
            has,
            startDate,
            endDate,
            limit,
            startingrow,
            sortBy,
        } = message;

        SwiftSearchAPI.searchQuery(q,
            senderId,
            threadId,
            has,
            startDate,
            endDate,
            limit,
            startingrow,
            sortBy,
        ).then((res: any) => {
            this.searchCallback(requestId, res);
        });
    }
}

module.exports = new SSAPIBridge();
