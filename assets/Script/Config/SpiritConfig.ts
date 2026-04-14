export interface SpiritConfigItem {
    level: number;
    attack: number;
    defense: number;
}

export const SPIRIT_CONFIG: Record<number, SpiritConfigItem> = {
    1: {
        level: 1,
        attack: 73,
        defense: 27,
    },
    2: {
        level: 2,
        attack: 128,
        defense: 72,
    },
    3: {
        level: 3,
        attack: 251,
        defense: 49,
    },
    4: {
        level: 4,
        attack: 272,
        defense: 128,
    },
    5: {
        level: 5,
        attack: 367,
        defense: 132,
    },
    6: {
        level: 6,
        attack: 471,
        defense: 129,
    },
    7: {
        level: 7,
        attack: 552,
        defense: 148,
    },
    8: {
        level: 8,
        attack: 612,
        defense: 198,
    },
    9: {
        level: 9,
        attack: 723,
        defense: 177,
    },
    10: {
        level: 10,
        attack: 830,
        defense: 170,
    },
    11: {
        level: 100,
        attack: 9227,
        defense: 773,
    },
    12: {
        level: 200,
        attack: 16220,
        defense: 3780,
    },
};

export function getSpiritConfig(spiritId: number | string | null | undefined) {
    const id = Number(spiritId);
    if (!Number.isFinite(id)) {
        return null;
    }
    return SPIRIT_CONFIG[id] ?? null;
}
