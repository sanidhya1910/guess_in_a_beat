import { describe, expect, it } from 'vitest';
import { artistsOverlap, judgeGuess, normalizeTitle, songKey, splitArtists } from './match';

describe('normalizeTitle', () => {
    it('drops recording qualifiers', () => {
        expect(normalizeTitle('Bohemian Rhapsody - Remastered 2011')).toBe('bohemian rhapsody');
        expect(normalizeTitle('Hey Jude - 2015 Mix')).toBe('hey jude');
        expect(normalizeTitle('Purple Rain (Live)')).toBe('purple rain');
        expect(normalizeTitle('Uptown Funk (feat. Bruno Mars)')).toBe('uptown funk');
        expect(normalizeTitle('Love Story (Taylor’s Version)')).toBe('love story');
        expect(normalizeTitle('Kesariya (From "Brahmastra")')).toBe('kesariya');
        expect(normalizeTitle('Old Town Road feat. Billy Ray Cyrus')).toBe('old town road');
    });

    it('keeps meaningful dashes and folds punctuation', () => {
        expect(normalizeTitle('Wake Me Up Before You Go-Go')).toBe('wake me up before you go go');
        expect(normalizeTitle("Don't Stop Me Now")).toBe('dont stop me now');
        expect(normalizeTitle('Señorita')).toBe('senorita');
        expect(normalizeTitle('Rock & Roll')).toBe('rock and roll');
    });

    it('handles titles that are mostly brackets', () => {
        expect(normalizeTitle('(I Can’t Get No) Satisfaction')).toBe('satisfaction');
        expect(normalizeTitle('(Untitled)')).toBe('untitled');
    });

    it('keeps non-Latin scripts intact', () => {
        expect(normalizeTitle('केसरिया')).toBe(normalizeTitle('केसरिया'));
        expect(normalizeTitle('केसरिया')).not.toBe('');
    });
});

describe('artists', () => {
    it('splits collaborations', () => {
        expect(splitArtists('Pritam, Arijit Singh & Amitabh Bhattacharya')).toEqual(['pritam', 'arijit singh', 'amitabh bhattacharya']);
        expect(splitArtists('Calvin Harris feat. Rihanna')).toEqual(['calvin harris', 'rihanna']);
        expect(splitArtists('The Weeknd')).toEqual(['weeknd']);
    });

    it('detects overlap', () => {
        expect(artistsOverlap('Mark Ronson & Bruno Mars', 'Bruno Mars')).toBe(true);
        expect(artistsOverlap('Beyoncé', 'Beyonce')).toBe(true);
        expect(artistsOverlap('Adele', 'Lionel Richie')).toBe(false);
    });
});

describe('judgeGuess', () => {
    const answer = { id: 1, title: 'Blinding Lights', artist: 'The Weeknd' };

    it('accepts the same recording', () => {
        expect(judgeGuess({ id: 1, title: 'x', artist: 'y' }, answer)).toBe('correct');
    });

    it('accepts other releases of the same song', () => {
        expect(judgeGuess({ id: 2, title: 'Blinding Lights (Remix)', artist: 'The Weeknd & ROSALÍA' }, answer)).toBe('correct');
    });

    it('flags the right artist as close', () => {
        expect(judgeGuess({ id: 3, title: 'Save Your Tears', artist: 'The Weeknd' }, answer)).toBe('close');
    });

    it('flags the right title by someone else as close', () => {
        expect(judgeGuess({ id: 4, title: 'Blinding Lights', artist: 'Some Cover Band' }, answer)).toBe('close');
    });

    it('rejects unrelated songs', () => {
        expect(judgeGuess({ id: 5, title: 'Hello', artist: 'Adele' }, answer)).toBe('wrong');
    });
});

describe('songKey', () => {
    it('collapses album and single releases', () => {
        expect(songKey({ title: 'Levitating', artist: 'Dua Lipa' })).toBe(
            songKey({ title: 'Levitating (feat. DaBaby)', artist: 'Dua Lipa feat. DaBaby' }),
        );
    });
});
