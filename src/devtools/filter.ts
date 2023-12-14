
class Condition {
    constructor(private include: string[], private exclude: string[]) {
    }

    matches(str: string): boolean {
        if (this.include.length) {
            const match = this.include.find(x => !str.includes(x));
            if (match) return false;
        }
        if (this.exclude.length) {
            const match = this.exclude.find(x => str.includes(x));
            if (match) return false;
        }
        return true;
    }
}


export class Filter {
    private conditions: Condition[] = [];

    constructor(str: string) {
        this.conditions = Filter.parseFilter(str);
    }

    private static parseFilter(str: string): Condition[] {
        return str.split(',')
            .map(x => x.trim().toLowerCase())
            .filter(x => x.length > 0)
            .map(Filter.parseCondition);
    }

    private static parseCondition(str: string): Condition {
        const components = str.split(/\s+/).filter(x => x.length > 0);
        return new Condition(
            components.filter(x => x[0] != '-'),
            components.filter(x => x[0] == '-').map(x => x.substring(1))
        );
    }

    matches(str: string): boolean {
        if (!this.conditions.length) {
            return true;
        }
        let s = str.toLowerCase();
        return !!this.conditions.find(c => c.matches(s));
    }

    matchesAny(r: string[]): boolean {
        return !!r.find(s => this.matches(s));
    }
}

export const ALWAYS_MATCH = new Filter('');
