import { PropertySet } from "./siebel";

export interface CommandMessage {
    beginTrack?: boolean;
}

export interface PageProfileAttributeInfo {
    retrieve: boolean;
    name: string;
    value: string;
    delay: number;
}

export interface PageApiInfo {
    id: string;
    success: boolean;
    async: boolean;
    service: string;
    method: string;
    request: PropertySet;
    response?: PropertySet;
    delay: number;
}

export interface PageVisitInfo {
    view: string;
    viewId?: string;
    strURL?: string;
    strTarget?: string;
}

export interface PageMessage {
    attribute?: PageProfileAttributeInfo;
    api?: PageApiInfo;
    visit?: PageVisitInfo;
    when: number;
}

export const PageToContentEvent = 'SBL_SD_PageToContentEvent';
export const ContentToPageEvent = 'SBL_SD_ContentToPageEvent';


export interface DevToolsMessage {
    message?: PageMessage;
    history?: PageMessage[];
}
