"""
Temporal Keyword Expansion Module

Generates hypotheses based on trending keywords during Bitcoin's early years.
Words and phrases that were culturally relevant during wallet creation
are more likely to have been used as passphrases.

Port of server/temporal-keywords.ts for use in Hephaestus hypothesis generation.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class TemporalKeyword:
    """Represents a temporally-relevant keyword"""
    keyword: str
    year: int
    category: str  # 'politics', 'technology', 'pop_culture', 'economics', 'social', 'crypto'
    relevance: float  # 0-1, how likely to be used as passphrase
    context: str  # Why this was significant


# 2009 Temporal Keywords
KEYWORDS_2009 = [
    # Politics
    TemporalKeyword('obama', 2009, 'politics', 0.7, 'Obama inauguration January 2009'),
    TemporalKeyword('inauguration', 2009, 'politics', 0.5, 'Historic inauguration'),
    TemporalKeyword('change we can believe in', 2009, 'politics', 0.6, 'Obama campaign slogan'),
    TemporalKeyword('yes we can', 2009, 'politics', 0.6, 'Obama slogan'),
    
    # Economics
    TemporalKeyword('bailout', 2009, 'economics', 0.8, 'Bank bailouts, inspired Bitcoin'),
    TemporalKeyword('financial crisis', 2009, 'economics', 0.7, '2008-2009 crisis'),
    TemporalKeyword('recession', 2009, 'economics', 0.6, 'Great Recession'),
    TemporalKeyword('too big to fail', 2009, 'economics', 0.7, 'Bank phrase'),
    TemporalKeyword('lehman brothers', 2009, 'economics', 0.6, 'Bankruptcy 2008'),
    
    # Technology
    TemporalKeyword('iphone 3gs', 2009, 'technology', 0.5, 'Released June 2009'),
    TemporalKeyword('windows 7', 2009, 'technology', 0.5, 'Released October 2009'),
    TemporalKeyword('twitter', 2009, 'technology', 0.5, 'Growing rapidly'),
    TemporalKeyword('netbook', 2009, 'technology', 0.4, 'Popular device type'),
    
    # Pop Culture
    TemporalKeyword('avatar', 2009, 'pop_culture', 0.6, 'Movie released December 2009'),
    TemporalKeyword('michael jackson', 2009, 'pop_culture', 0.6, 'Died June 2009'),
    TemporalKeyword('swine flu', 2009, 'social', 0.5, 'H1N1 pandemic'),
    TemporalKeyword('miracle on the hudson', 2009, 'social', 0.5, 'January 2009 plane landing'),
    
    # Crypto
    TemporalKeyword('satoshi', 2009, 'crypto', 0.9, 'Bitcoin creator'),
    TemporalKeyword('genesis block', 2009, 'crypto', 0.8, 'First Bitcoin block'),
    TemporalKeyword('chancellor brink', 2009, 'crypto', 0.8, 'Genesis block headline'),
]

# 2010 Temporal Keywords
KEYWORDS_2010 = [
    # Technology
    TemporalKeyword('ipad', 2010, 'technology', 0.6, 'Released April 2010'),
    TemporalKeyword('instagram', 2010, 'technology', 0.5, 'Launched October 2010'),
    TemporalKeyword('foursquare', 2010, 'technology', 0.4, 'Popular check-in app'),
    
    # Crypto
    TemporalKeyword('pizza day', 2010, 'crypto', 0.8, '10,000 BTC for pizza May 22'),
    TemporalKeyword('laszlo', 2010, 'crypto', 0.6, 'Pizza buyer'),
    TemporalKeyword('bitcoin faucet', 2010, 'crypto', 0.7, 'Gavin Andresen faucet'),
    TemporalKeyword('slush pool', 2010, 'crypto', 0.6, 'First mining pool'),
    TemporalKeyword('wikileaks', 2010, 'crypto', 0.7, 'Bitcoin donations controversy'),
    
    # Pop Culture
    TemporalKeyword('inception', 2010, 'pop_culture', 0.5, 'Popular movie'),
    TemporalKeyword('fifa world cup', 2010, 'pop_culture', 0.4, 'South Africa 2010'),
    TemporalKeyword('vuvuzela', 2010, 'pop_culture', 0.4, 'World Cup horn'),
    
    # Social
    TemporalKeyword('deepwater horizon', 2010, 'social', 0.5, 'Oil spill disaster'),
    TemporalKeyword('haiti earthquake', 2010, 'social', 0.4, 'January 2010 disaster'),
]

# 2011 Temporal Keywords
KEYWORDS_2011 = [
    # Crypto
    TemporalKeyword('silk road', 2011, 'crypto', 0.7, 'Darknet market launched'),
    TemporalKeyword('one dollar', 2011, 'crypto', 0.7, 'BTC reached $1'),
    TemporalKeyword('parity', 2011, 'crypto', 0.6, 'BTC = USD parity'),
    TemporalKeyword('mtgox', 2011, 'crypto', 0.8, 'Major exchange'),
    
    # Social
    TemporalKeyword('arab spring', 2011, 'social', 0.6, 'Middle East uprisings'),
    TemporalKeyword('occupy wall street', 2011, 'social', 0.7, 'Financial protest movement'),
    TemporalKeyword('we are the 99', 2011, 'social', 0.6, 'Occupy slogan'),
    TemporalKeyword('fukushima', 2011, 'social', 0.5, 'Nuclear disaster'),
    TemporalKeyword('bin laden', 2011, 'politics', 0.5, 'Death May 2011'),
    
    # Technology
    TemporalKeyword('iphone 4s', 2011, 'technology', 0.5, 'Released October 2011'),
    TemporalKeyword('siri', 2011, 'technology', 0.5, 'Voice assistant debut'),
    TemporalKeyword('google plus', 2011, 'technology', 0.4, 'Launched June 2011'),
    
    # Pop Culture
    TemporalKeyword('game of thrones', 2011, 'pop_culture', 0.5, 'TV series premiered'),
    TemporalKeyword('steve jobs', 2011, 'pop_culture', 0.6, 'Died October 2011'),
]

# 2012 Temporal Keywords
KEYWORDS_2012 = [
    # Crypto
    TemporalKeyword('first halving', 2012, 'crypto', 0.8, 'November 2012'),
    TemporalKeyword('halving day', 2012, 'crypto', 0.7, 'Block reward cut to 25'),
    TemporalKeyword('asic mining', 2012, 'crypto', 0.7, 'ASIC miners announced'),
    TemporalKeyword('butterfly labs', 2012, 'crypto', 0.6, 'ASIC manufacturer'),
    TemporalKeyword('coinbase', 2012, 'crypto', 0.7, 'Exchange founded'),
    TemporalKeyword('bitcoin foundation', 2012, 'crypto', 0.6, 'Founded September'),
    
    # Social/Politics
    TemporalKeyword('mayan calendar', 2012, 'social', 0.5, '2012 apocalypse myth'),
    TemporalKeyword('gangnam style', 2012, 'pop_culture', 0.6, 'Viral sensation'),
    TemporalKeyword('hurricane sandy', 2012, 'social', 0.4, 'October 2012 storm'),
    TemporalKeyword('london olympics', 2012, 'pop_culture', 0.4, 'Summer 2012'),
]

# 2013 Temporal Keywords
KEYWORDS_2013 = [
    # Crypto
    TemporalKeyword('one thousand', 2013, 'crypto', 0.8, 'BTC hit $1000'),
    TemporalKeyword('cyprus crisis', 2013, 'crypto', 0.7, 'Bank crisis, BTC interest spike'),
    TemporalKeyword('silk road raid', 2013, 'crypto', 0.6, 'FBI shutdown October'),
    TemporalKeyword('ross ulbricht', 2013, 'crypto', 0.5, 'Silk Road arrest'),
    TemporalKeyword('bip32', 2013, 'crypto', 0.6, 'HD wallet standard'),
    TemporalKeyword('bip39', 2013, 'crypto', 0.6, 'Mnemonic standard'),
    
    # Pop Culture
    TemporalKeyword('snowden', 2013, 'politics', 0.7, 'NSA whistleblower'),
    TemporalKeyword('prism', 2013, 'politics', 0.6, 'NSA surveillance program'),
    TemporalKeyword('breaking bad', 2013, 'pop_culture', 0.5, 'Final season'),
    TemporalKeyword('bitcoin accepted here', 2013, 'crypto', 0.6, 'Merchant adoption growing'),
]


def get_keywords_by_year(year: int) -> List[TemporalKeyword]:
    """Get all temporal keywords for a specific year"""
    if year == 2009:
        return KEYWORDS_2009
    elif year == 2010:
        return KEYWORDS_2010
    elif year == 2011:
        return KEYWORDS_2011
    elif year == 2012:
        return KEYWORDS_2012
    elif year == 2013:
        return KEYWORDS_2013
    else:
        return []


def get_keywords_by_year_range(start_year: int, end_year: int) -> List[TemporalKeyword]:
    """Get temporal keywords for a year range"""
    keywords = []
    for year in range(start_year, end_year + 1):
        keywords.extend(get_keywords_by_year(year))
    return keywords


def get_keywords_by_category(category: str) -> List[TemporalKeyword]:
    """Get keywords by category across all years"""
    all_keywords = (
        KEYWORDS_2009 +
        KEYWORDS_2010 +
        KEYWORDS_2011 +
        KEYWORDS_2012 +
        KEYWORDS_2013
    )
    return [k for k in all_keywords if k.category == category]


def get_high_relevance_keywords(threshold: float = 0.7) -> List[TemporalKeyword]:
    """Get high-relevance keywords (relevance >= threshold)"""
    all_keywords = (
        KEYWORDS_2009 +
        KEYWORDS_2010 +
        KEYWORDS_2011 +
        KEYWORDS_2012 +
        KEYWORDS_2013
    )
    
    keywords = [k for k in all_keywords if k.relevance >= threshold]
    keywords.sort(key=lambda k: k.relevance, reverse=True)
    return keywords


def generate_temporal_combinations(
    base_phrase: str,
    year: Optional[int] = None,
    max_combinations: int = 100
) -> List[str]:
    """
    Generate passphrase combinations using temporal keywords
    """
    combinations = []
    keywords = get_keywords_by_year(year) if year else get_high_relevance_keywords(0.6)
    
    for kw in keywords:
        # Add keyword before base phrase
        combinations.append(f"{kw.keyword} {base_phrase}")
        
        # Add keyword after base phrase
        combinations.append(f"{base_phrase} {kw.keyword}")
        
        # Add year suffix
        combinations.append(f"{base_phrase}{year or kw.year}")
        
        # Combined with year
        combinations.append(f"{kw.keyword}{year or kw.year}")
    
    return combinations[:max_combinations]


def get_all_keywords_sorted() -> List[TemporalKeyword]:
    """Get all temporal keywords sorted by relevance"""
    all_keywords = (
        KEYWORDS_2009 +
        KEYWORDS_2010 +
        KEYWORDS_2011 +
        KEYWORDS_2012 +
        KEYWORDS_2013
    )
    
    all_keywords.sort(key=lambda k: k.relevance, reverse=True)
    return all_keywords


def get_crypto_specific_keywords() -> List[TemporalKeyword]:
    """Get only crypto-specific keywords (highest priority)"""
    return get_keywords_by_category('crypto')
