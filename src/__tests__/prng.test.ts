import { describe, it, expect } from 'vitest';
import { createPRNG } from '../engine/prng.js';

describe('PRNG (Mulberry32)', () => {
    describe('Determinism', () => {
        it('same seed produces the same sequence', () => {
            const rng1 = createPRNG(42);
            const rng2 = createPRNG(42);

            const seq1 = Array.from({ length: 100 }, () => rng1.next());
            const seq2 = Array.from({ length: 100 }, () => rng2.next());

            expect(seq1).toEqual(seq2);
        });

        it('different seeds produce different sequences', () => {
            const rng1 = createPRNG(42);
            const rng2 = createPRNG(99);

            const seq1 = Array.from({ length: 20 }, () => rng1.next());
            const seq2 = Array.from({ length: 20 }, () => rng2.next());

            expect(seq1).not.toEqual(seq2);
        });

        it('seed 0 works without division by zero', () => {
            const rng = createPRNG(0);
            const val = rng.next();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        });
    });

    describe('next()', () => {
        it('returns values in [0, 1)', () => {
            const rng = createPRNG(123);
            for (let i = 0; i < 1000; i++) {
                const val = rng.next();
                expect(val).toBeGreaterThanOrEqual(0);
                expect(val).toBeLessThan(1);
            }
        });
    });

    describe('nextInt()', () => {
        it('returns values in [min, max] inclusive', () => {
            const rng = createPRNG(456);
            const results = new Set<number>();
            for (let i = 0; i < 1000; i++) {
                const val = rng.nextInt(1, 6);
                expect(val).toBeGreaterThanOrEqual(1);
                expect(val).toBeLessThanOrEqual(6);
                results.add(val);
            }
            // Should hit all values 1-6 in 1000 tries
            expect(results.size).toBe(6);
        });

        it('throws on min > max', () => {
            const rng = createPRNG(1);
            expect(() => rng.nextInt(10, 5)).toThrow('min');
        });
    });

    describe('nextFloat()', () => {
        it('returns values in [min, max)', () => {
            const rng = createPRNG(789);
            for (let i = 0; i < 1000; i++) {
                const val = rng.nextFloat(2.0, 5.0);
                expect(val).toBeGreaterThanOrEqual(2.0);
                expect(val).toBeLessThan(5.0);
            }
        });

        it('throws on min > max', () => {
            const rng = createPRNG(1);
            expect(() => rng.nextFloat(5.0, 2.0)).toThrow('min');
        });
    });

    describe('nextBool()', () => {
        it('with p=1.0 always returns true', () => {
            const rng = createPRNG(1);
            for (let i = 0; i < 100; i++) {
                expect(rng.nextBool(1.0)).toBe(true);
            }
        });

        it('with p=0 always returns false', () => {
            const rng = createPRNG(1);
            for (let i = 0; i < 100; i++) {
                expect(rng.nextBool(0)).toBe(false);
            }
        });
    });

    describe('pick()', () => {
        it('returns elements from the array', () => {
            const rng = createPRNG(42);
            const arr = ['a', 'b', 'c'];
            for (let i = 0; i < 100; i++) {
                expect(arr).toContain(rng.pick(arr));
            }
        });

        it('throws on empty array', () => {
            const rng = createPRNG(1);
            expect(() => rng.pick([])).toThrow('empty');
        });
    });

    describe('shuffle()', () => {
        it('returns same elements in (usually) different order', () => {
            const rng = createPRNG(42);
            const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const original = [...arr];
            rng.shuffle(arr);
            expect(arr.sort()).toEqual(original.sort());
        });

        it('is deterministic', () => {
            const arr1 = [1, 2, 3, 4, 5];
            const arr2 = [1, 2, 3, 4, 5];
            createPRNG(42).shuffle(arr1);
            createPRNG(42).shuffle(arr2);
            expect(arr1).toEqual(arr2);
        });
    });
});
