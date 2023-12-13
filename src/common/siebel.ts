
export interface TopLevelSiebelApp {
    S_App: InnerLevelSiebelApp;
}

export interface InnerLevelSiebelApp {
    __withApiTracking?: boolean;

    SetProfileAttr(name: string, value: any): boolean;
    GetProfileAttr(name: string): string;
    GetService(name: string): SiebelService;
    GotoView(view: string, viewId?: string, strURL?: string, strTarget?: string): void;
    NewPropertySet(): SiebelPropertySet;
}

export interface SiebelService {
    __withApiTracking?: boolean;

    InvokeMethod(name: string, input: SiebelPropertySet, config?: SiebelMethodConfig): SiebelPropertySet;
}

export interface SiebelPropertySet {
    AddChild(child: SiebelPropertySet): boolean;
    Clone(): SiebelPropertySet,
    Copy(old: SiebelPropertySet): void,
    DeepCopy(inputPS: SiebelPropertySet): void,
    GetChild(index: number): SiebelPropertySet | undefined,
    GetChildByType(type: string, isChildren: boolean): SiebelPropertySet | undefined,
    GetChildCount(): number,
    GetPropertiesSize(): number,
    GetProperty(name: string): string | undefined,
    GetPropertyAsStr(name: string): string | undefined,
    GetPropertyCount(): number,
    GetType(): string,
    GetValue(): string,
    InsertChildAt(child: SiebelPropertySet, index: number): boolean,
    IsEmpty(propSet: SiebelPropertySet): boolean,
    PropertyExists(name: string): boolean,
    RemoveChild(index: number): boolean,
    RemoveProperty(name: string): boolean,
    Reset(): void,
    SetProperty(name: string, value: string): boolean,
    SetPropertyStr(name: string, value: string): boolean,
    SetType(type: string): void,
    SetValue(value: string): void,

    childArray: SiebelPropertySet[];
    childEnum: number;
    propArray: { [key: string]: string };
    propArrayLen: number;
    type: string;
    value: string;
}

export type SiebelMethodResponseCallback = (name: string, request: SiebelPropertySet, response: SiebelPropertySet) => void;

export interface SiebelMethodConfig {
    async: boolean;
    selfbusy: boolean;
    mask: boolean;
    scope?: unknown;
    errcb?: SiebelMethodResponseCallback;
    cb?: SiebelMethodResponseCallback;
}


export function getSiebelApp(): TopLevelSiebelApp | undefined {
    return (window as any).SiebelApp as TopLevelSiebelApp;
}

export function getTheApplication(): (() => InnerLevelSiebelApp) | undefined {
    return (window as any).TheApplication as () => InnerLevelSiebelApp;
}


export interface PropertySetBase {
    __children?: PropertySet[];
    __type?: string;
}
export interface PropertySetValues {
    [key: string]: string;
}
export type PropertySet = PropertySetBase & PropertySetValues;

export function T(p: SiebelPropertySet): PropertySet {
    const ret: PropertySet = {};

    Object.keys(p.propArray)
        .forEach(k => ret[k] = p.propArray[k]);

    if (p.childArray && p.childArray.length) {
        ret.__children = p.childArray.map(T);
    }

    if (p.type) {
        ret.__type = p.type;
    }

    return ret;
}

export function R(x: PropertySet): SiebelPropertySet {
    const SiebelApp: TopLevelSiebelApp = (window as any).SiebelApp as TopLevelSiebelApp;
    const ret = SiebelApp.S_App.NewPropertySet();

    Object.keys(x)
        .filter(k => k.substring(0, 2) !== '__')
        .forEach(k => ret.SetProperty(k, x[k]));

    if (x.__type) {
        ret.SetType(x.__type);
    }

    if (x.__children) {
        x.__children.map(R).forEach(c => ret.AddChild(c));
    }

    return ret;
}
