/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 *
 * A fast, deterministic 32-bit PRNG. Given the same seed, it always
 * produces the same sequence of values. Not cryptographically secure —
 * intended for simulation reproducibility, not security.
 *
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */

export interface PRNG {
    /** Returns the next float in [0, 1) */
    next(): number;
    /** Returns a random integer in [min, max] (inclusive) */
    nextInt(min: number, max: number): number;
    /** Returns a random float in [min, max) */
    nextFloat(min: number, max: number): number;
    /** Returns true with probability p (default 0.5) */
    nextBool(p?: number): boolean;
    /** Picks a random element from an array */
    pick<T>(arr: readonly T[]): T;
    /** Shuffles an array in-place (Fisher-Yates) */
    shuffle<T>(arr: T[]): T[];
}

/**
 * Creates a seeded PRNG using the Mulberry32 algorithm.
 *
 * @param seed - Integer seed. Same seed always produces the same sequence.
 * @returns A PRNG instance with deterministic methods.
 *
 * @example
 * ```ts
 * const rng = createPRNG(42);
 * rng.next();        // always 0.1548890098836273 with seed 42
 * rng.nextInt(1, 6); // deterministic dice roll
 * ```
 */
export function createPRNG(seed: number): PRNG {
    let state = seed | 0; // Ensure 32-bit integer

    function mulberry32(): number {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
        next(): number {
            return mulberry32();
        },

        nextInt(min: number, max: number): number {
            if (min > max) throw new RangeError(`nextInt: min (${min}) > max (${max})`);
            const range = max - min + 1;
            return Math.floor(mulberry32() * range) + min;
        },

        nextFloat(min: number, max: number): number {
            if (min > max) throw new RangeError(`nextFloat: min (${min}) > max (${max})`);
            return mulberry32() * (max - min) + min;
        },

        nextBool(p = 0.5): boolean {
            return mulberry32() < p;
        },

        pick<T>(arr: readonly T[]): T {
            if (arr.length === 0) throw new Error('pick: empty array');
            return arr[Math.floor(mulberry32() * arr.length)];
        },

        shuffle<T>(arr: T[]): T[] {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(mulberry32() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },
    };
}
