import { PageApiInfo, PageMessage, PageProfileAttributeInfo, PageVisitInfo } from "../common/comms";
import { humanReadableDuration } from "./tools";

export interface SiebelActionData {
    id: string;
    status: boolean;
    pending: boolean;
    label: string;
    duration: string;
};


let attrId = 0;
let visitId = 0;


export function apiToStatusBarData(item: PageApiInfo): SiebelActionData {
    let method = item.method;
    if (item.method === 'RunProcess' && item.request.ProcessName) {
        method = item.request.ProcessName;
    }

    return {
        id: 'method' + item.id,
        status: item.success,
        pending: !item.response,
        label: `[${item.async ? '&#x021c4;'/* ⇄ */ : '&#x027f7;' /* ⟷ */}] ${item.service} / ${method}`,
        duration: humanReadableDuration(item.delay),
    };
}

function visitToStatusBarData(item: PageVisitInfo): SiebelActionData {
    return {
        id: 'visit' + ++visitId,
        status: true,
        pending: false,
        label: `GOTO [${item.view}]`,
        duration: '-',
    };
}

function attributeToStatusBarData(item: PageProfileAttributeInfo): SiebelActionData {
    const action = item.retrieve ? 'GET' : 'SET';
    return {
        id: 'attr' + ++attrId,
        status: true,
        pending: false,
        label: `[${action}] Profile Attribute [${item.name}] :: [${item.value}]`,
        duration: humanReadableDuration(item.delay),
    };
}

export function toStatusBarData(item: PageMessage): SiebelActionData {
    if (item.api) {
        return apiToStatusBarData(item.api);
    }
    if (item.attribute) {
        return attributeToStatusBarData(item.attribute);
    }
    return visitToStatusBarData(item.visit as PageVisitInfo);
}
