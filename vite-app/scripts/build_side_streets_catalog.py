import html
import json
import math
import re
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/extra-areas.ts'
LMS = 'https://public.gis.lacounty.gov/public/rest/services/LACounty_Dynamic/LMS_Data_Public/MapServer'
DPW = 'https://dpw.gis.lacounty.gov/dpw/rest/services/GIS_Web_Services/MapServer/24'
FIELDS = 'OBJECTID,name,org_name,cat1,cat2,cat3,addrln1,addrln2,city,state,zip,hours,phones,url,info1,info2,description,link,use_type,latitude,longitude,tags,isCounty,dis_status'
REGION_ORDER = ['northeast', 'central', 'eastside', 'sgv', 'mountains', 'valleys', 'santaclarita', 'antelope', 'westside', 'southbay', 'longbeach', 'islands']
CATEGORY_LABELS = {
    'park': 'Park or garden',
    'nature': 'Natural area',
    'coast': 'Beach or marina',
    'trail': 'Trail',
    'museum': 'Museum or aquarium',
    'culture': 'Arts and culture',
    'campground': 'Campground',
    'recreation': 'Recreation center',
}
CATEGORY_ORDER = list(CATEGORY_LABELS)


def get_json(url, params=None):
    if params:
        url += '?' + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={'User-Agent': 'Side-Streets-catalog-builder/1.0'})
    with urllib.request.urlopen(request, timeout=100) as response:
        return json.load(response)


def clean(value):
    if value is None:
        return ''
    value = html.unescape(str(value))
    value = re.sub(r'(?i)<br\s*/?>', '. ', value)
    value = re.sub(r'(?i)</p\s*>', '. ', value)
    value = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def clean_city(value):
    city = clean(value)
    return '' if re.fullmatch(r'\d{5}(?:-\d{4})?', city) else city


def shorten(value, limit=175):
    value = clean(value)
    if not value or re.match(r'(?i)the department provides recreational programs', value):
        return ''
    value = re.sub(r'(?i)operating hours.*$', '', value).strip()
    if not value:
        return ''
    sentences = re.split(r'(?<=[.!?])\s+', value)
    result = sentences[0]
    if len(result) < 55 and len(sentences) > 1:
        result += ' ' + sentences[1]
    if len(result) > limit:
        result = result[:limit].rsplit(' ', 1)[0].rstrip(' ,;:') + '…'
    return result


def slugify(value):
    value = unicodedata.normalize('NFKD', clean(value)).encode('ascii', 'ignore').decode()
    value = value.lower().replace('&', ' and ')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', value)).strip('-') or 'location'


def name_key(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', clean(value)).encode('ascii', 'ignore').decode().lower())


def valid_coords(lat, lng):
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return False
    return 33.25 <= lat <= 35.25 and -119.1 <= lng <= -117.2 and (lat, lng) != (0, 0)


def website(value):
    value = clean(value)
    if not value or value.startswith(('javascript:', 'mailto:')):
        return None
    if not value.startswith(('http://', 'https://')):
        value = 'https://' + value
    return value if value.startswith(('http://', 'https://')) else None


CITY_GROUPS = {
    'longbeach': {'long beach', 'signal hill'},
    'islands': {'avalon', 'two harbors', 'catalina island', 'catalina'},
    'antelope': {'lancaster', 'palmdale', 'quartz hill', 'littlerock', 'little rock', 'pear blossom', 'pearblossom', 'acton', 'lake los angeles', 'llano', 'valyermo', 'juniper hills', 'sun village', 'lake hughes', 'green valley', 'leona valley', 'rosamond'},
    'santaclarita': {'santa clarita', 'newhall', 'valencia', 'saugus', 'canyon country', 'castaic', 'stevenson ranch', 'val verde'},
    'southbay': {'torrance', 'redondo beach', 'hermosa beach', 'manhattan beach', 'el segundo', 'hawthorne', 'gardena', 'lawndale', 'lomita', 'carson', 'san pedro', 'wilmington', 'harbor city', 'harbor gateway', 'palos verdes', 'palos verdes estates', 'rancho palos verdes', 'rolling hills', 'rolling hills estates', 'west carson', 'compton', 'lynwood', 'paramount', 'bellflower', 'hawaiian gardens', 'lakewood', 'artesia', 'cerritos'},
    'westside': {'santa monica', 'culver city', 'beverly hills', 'malibu', 'marina del rey', 'playa del rey', 'pacific palisades', 'west hollywood', 'venice', 'westchester', 'playa vista', 'del rey', 'mar vista', 'west los angeles', 'brentwood', 'topanga'},
    'sgv': {'pasadena', 'arcadia', 'monrovia', 'duarte', 'azusa', 'glendora', 'san dimas', 'la verne', 'claremont', 'pomona', 'walnut', 'diamond bar', 'rowland heights', 'hacienda heights', 'west covina', 'covina', 'el monte', 'rosemead', 'san gabriel', 'alhambra', 'monterey park', 'temple city', 'sierra madre', 'south pasadena', 'la puente', 'baldwin park', 'irwindale', 'bradbury', 'whittier', 'la habra heights', 'la mirada', 'norwalk', 'downey', 'pico rivera', 'santa fe springs', 'south el monte', 'avocado heights', 'vincent', 'charter oak', 'mayflower village'},
    'valleys': {'san fernando', 'pacoima', 'sylmar', 'north hollywood', 'van nuys', 'reseda', 'encino', 'tarzana', 'woodland hills', 'canoga park', 'chatsworth', 'granada hills', 'northridge', 'sherman oaks', 'studio city', 'toluca lake', 'sun valley', 'sunland', 'tujunga', 'burbank', 'glendale', 'la crescenta', 'la canada flintridge', 'lake view terrace', 'shadow hills', 'arleta', 'panorama city', 'mission hills', 'north hills', 'winnetka', 'west hills', 'calabasas', 'hidden hills', 'agoura hills'},
    'northeast': {'highland park', 'eagle rock', 'mount washington', 'glassell park', 'atwater village', 'cypress park', 'lincoln heights', 'montecito heights', 'hermon', 'altadena'},
    'eastside': {'east los angeles', 'boyle heights', 'commerce', 'montebello', 'huntington park', 'maywood', 'bell', 'cudahy', 'south gate', 'vernon', 'el sereno', 'city terrace', 'monterey park'},
}
CITY_TO_REGION = {city: region for region, cities in CITY_GROUPS.items() for city in cities}


def region_for(city, lat, lng):
    city = clean(city).lower().rstrip('.')
    if city in CITY_TO_REGION:
        return CITY_TO_REGION[city]
    if 'catalina' in city or (lat < 33.65 and lng < -118.25):
        return 'islands'
    if lat >= 34.55 and lng > -118.8:
        return 'antelope'
    if lat >= 34.35 and -118.8 < lng < -118.4:
        return 'santaclarita'
    if lat < 33.84 and -118.25 < lng < -118.05:
        return 'longbeach'
    if lat < 33.96 and lng < -118.22:
        return 'southbay'
    if lng < -118.38 and lat < 34.18:
        return 'westside'
    if lat >= 34.14 and -118.65 < lng < -118.25:
        return 'valleys'
    if lng > -118.12 and 33.94 < lat < 34.38:
        return 'sgv'
    if lat >= 34.18 and -118.45 < lng < -117.55:
        return 'mountains'
    if lat >= 34.08 and -118.30 < lng < -118.12:
        return 'northeast'
    if lat < 34.10 and lng > -118.25:
        return 'eastside'
    return 'central'


def is_admin(name, category):
    n = clean(name).lower()
    if not n:
        return True
    if any(term in n for term in ['department of', 'department', 'administrative office', 'administration building', 'county of los angeles', 'city of ']):
        return True
    if category == 'nature' and any(term in n for term in ['ranger station', 'ranger office', 'district ranger', ' station']):
        return True
    if category == 'coast' and any(term in n for term in ['port of', 'department', 'office']):
        return True
    if category in {'museum', 'culture'} and any(term in n for term in ['commission', 'council', 'foundation', 'association', 'friends of', 'city of', 'county of']):
        return True
    return False


def raw_tags(value):
    return list(dict.fromkeys(clean(tag) for tag in str(value or '').split('|') if clean(tag)))


def tag_slug(value):
    return re.sub(r'\s+', ' ', clean(value).lower()).strip()


def best_for(category, tags):
    joined = ' '.join(tags).lower()
    if any(x in joined for x in ['play area', 'playground', 'splash']):
        return 'Playgrounds and family time'
    if any(x in joined for x in ['picnic', 'barbecue']):
        return 'Picnics and low-key afternoons'
    if any(x in joined for x in ['basketball', 'tennis', 'soccer', 'baseball', 'softball', 'fitness', 'gym', 'skate']):
        return 'Courts, fields and casual recreation'
    return {
        'park': 'An easy outdoor break close to home',
        'nature': 'Trail walks and a quieter outdoor detour',
        'coast': 'Beach walks and time by the water',
        'trail': 'Hiking and getting outside',
        'museum': 'A culture stop with something to learn',
        'culture': 'Live performance and local arts',
        'campground': 'An overnight outdoors',
        'recreation': 'Classes, courts and community programs',
    }[category]


def best_time(category):
    return {
        'park': 'Weekday morning for a quieter visit',
        'nature': 'Early morning; check weather and conditions',
        'coast': 'Morning for calm conditions; sunset for the view',
        'trail': 'Early morning; check weather and trail conditions',
        'museum': 'Check current hours before you go',
        'culture': 'Check the current program and hours',
        'campground': 'Check reservations and seasonal access',
        'recreation': 'Check current hours and program schedules',
    }[category]


def description_sentences(value):
    value = clean(value)
    if re.match(r'(?i)the department provides recreational programs', value):
        return []
    value = re.sub(r'(?i)operating hours.*$', '', value).strip()
    return [part.strip() for part in re.split(r'(?<=[.!?])\s+', value) if len(part.strip()) > 25]


def make_candidate(attrs, category, source_label, source_url, source_id):
    name = clean(attrs.get('name') or attrs.get('PARK_NAME'))
    lat, lng = attrs.get('latitude', attrs.get('CENTER_LAT')), attrs.get('longitude', attrs.get('CENTER_LON'))
    if not valid_coords(lat, lng) or is_admin(name, category):
        return None
    lat, lng = round(float(lat), 6), round(float(lng), 6)
    city = clean_city(attrs.get('city') or attrs.get('CITY'))
    address = ' '.join(x for x in [clean(attrs.get('addrln1') or attrs.get('ADDRESS')), clean(attrs.get('addrln2'))] if x)
    tags = raw_tags(attrs.get('tags'))
    lower_name = name.lower()
    if not tags:
        if 'golf course' in lower_name:
            tags = ['Golf']
        elif 'dog' in lower_name and 'park' in lower_name:
            tags = ['Dog park']
        elif any(x in lower_name for x in ['botanic', 'garden']):
            tags = ['Gardens']
    description = clean(attrs.get('description'))
    if re.match(r'(?i)the department provides recreational programs', description):
        description = ''
    sentences = description_sentences(description)
    identity = shorten(description)
    if not identity:
        identity = shorten(attrs.get('info1')) or shorten(attrs.get('info2'))
    if not identity and tags:
        identity = f"{CATEGORY_LABELS[category]} in {city or 'LA County'} with {', '.join(tags[:2]).lower()}."
    if not identity:
        identity = f"{CATEGORY_LABELS[category]} in {city or 'LA County'}."
    if len(identity) < 12:
        identity = f"{CATEGORY_LABELS[category]} in {city or 'LA County'}."

    bonuses = []
    for tag in tags:
        if tag not in bonuses:
            bonuses.append(tag)
    if not bonuses:
        for sentence in sentences[1:3]:
            item = shorten(sentence, 150)
            if item and item != identity and item not in bonuses:
                bonuses.append(item)
    if not bonuses and address:
        bonuses.append(address + (f', {city}' if city and city.lower() not in address.lower() else ''))
    hours = shorten(attrs.get('hours') or attrs.get('HOURS'), 150)
    if len(bonuses) < 2 and hours:
        bonuses.append('Hours: ' + hours)
    site = website(attrs.get('url') or attrs.get('link') or attrs.get('AGNCY_WEB'))
    if len(bonuses) < 2:
        bonuses.append('Official listing for current hours and access' if site else 'Check current access and conditions before visiting')
    if len(bonuses) < 2:
        bonuses.append(f"Listed as a {CATEGORY_LABELS[category].lower()} in the county recreation directory")
    bonuses = bonuses[:4]
    region = region_for(city, lat, lng)
    search_tags = list(dict.fromkeys([tag_slug(tag) for tag in tags] + [category, region]))
    result = {
        'slug': slugify(name),
        'name': name,
        'region': region,
        'category': category,
        'identity': identity,
        'bonuses': bonuses,
        'bestFor': best_for(category, tags),
        'bestTime': best_time(category),
        'pairing': f"Explore more around {city}" if city else 'Pair it with another nearby stop',
        'lat': lat,
        'lng': lng,
        'status': 'new',
        'tags': search_tags,
        'source': source_label,
        'sourceUrl': source_url,
        '_sourceId': str(source_id),
        '_quality': (5 if tags else 0) + (4 if description else 0) + (2 if address else 0) + (1 if city else 0) + (1 if site else 0),
        '_nameKey': name_key(name),
    }
    if city:
        result['city'] = city
    if address:
        result['address'] = address
    if hours:
        result['hours'] = hours
    if site:
        result['website'] = site
    return result


def fetch_lms(layer):
    features = []
    offset = 0
    while True:
        data = get_json(f'{LMS}/{layer}/query', {
            'where': '1=1', 'outFields': FIELDS, 'returnGeometry': 'false',
            'f': 'json', 'resultRecordCount': 1000, 'resultOffset': offset,
        })
        batch = data.get('features', [])
        features.extend(batch)
        if not data.get('exceededTransferLimit') or not batch:
            break
        offset += len(batch)
    return features


def distance(a, b):
    return math.sqrt((a['lat'] - b['lat']) ** 2 + (a['lng'] - b['lng']) ** 2)


def main():
    candidates = []
    dpw_data = get_json(f'{DPW}/query', {
        'where': '1=1', 'outFields': 'OBJECTID,PARK_NAME,ADDRESS,CITY,CENTER_LAT,CENTER_LON,HOURS,AGNCY_WEB',
        'returnGeometry': 'false', 'f': 'json', 'resultRecordCount': 1000,
    })
    for feature in dpw_data.get('features', []):
        attrs = feature['attributes']
        name = clean(attrs.get('PARK_NAME')).lower()
        category = 'nature' if any(x in name for x in ['natural area', 'wildlife', 'sanctuary', 'botanic', 'garden', 'nature', 'reserve', 'wilderness']) else 'park'
        candidate = make_candidate(attrs, category, 'LA County GIS · County Parks and Open Space', DPW, attrs.get('OBJECTID'))
        if candidate:
            candidates.append(candidate)

    layer_categories = {8: 'park', 7: 'nature', 1: 'coast', 18: 'trail', 6: 'museum', 4: 'culture', 2: 'campground', 12: 'recreation'}
    for layer, category in layer_categories.items():
        for feature in fetch_lms(layer):
            attrs = feature['attributes']
            candidate = make_candidate(attrs, category, f'LA County GIS · {attrs.get("cat2") or CATEGORY_LABELS[category]}', f'{LMS}/{layer}', attrs.get('OBJECTID'))
            if candidate:
                candidates.append(candidate)

    # Keep the richest record when the county directories describe the same place.
    candidates.sort(key=lambda item: (-item['_quality'], item['name']))
    unique = []
    by_name = defaultdict(list)
    for candidate in candidates:
        duplicate = next((old for old in by_name[candidate['_nameKey']] if distance(candidate, old) < 0.012), None)
        if duplicate:
            for field in ['city', 'address', 'hours', 'website']:
                if field not in duplicate and field in candidate:
                    duplicate[field] = candidate[field]
            continue
        by_name[candidate['_nameKey']].append(candidate)
        unique.append(candidate)

    existing_text = (ROOT / 'src/data/areas.ts').read_text()
    existing_names = {name_key(match) for match in re.findall(r"^    name: '([^']+)'", existing_text, re.M)}
    unique = [item for item in unique if item['_nameKey'] not in existing_names]

    caps = {'park': 450, 'nature': 120, 'coast': 75, 'trail': 63, 'museum': 58, 'culture': 27, 'campground': 50, 'recreation': 40}
    selected = []
    for category in CATEGORY_ORDER:
        groups = defaultdict(list)
        for item in sorted((x for x in unique if x['category'] == category), key=lambda x: (-x['_quality'], x['name'])):
            groups[item['region']].append(item)
        chosen = []
        while len(chosen) < caps[category] and any(groups.values()):
            for region in REGION_ORDER:
                if groups[region] and len(chosen) < caps[category]:
                    chosen.append(groups[region].pop(0))
        selected.extend(chosen)

    selected.sort(key=lambda item: (CATEGORY_ORDER.index(item['category']), item['name'], item.get('city', '')))
    used_slugs = set(re.findall(r"^    slug: '([^']+)'", existing_text, re.M))
    for item in selected:
        base = item['slug']
        slug = base
        if slug in used_slugs:
            slug = f"{base}-{slugify(item.get('city', ''))}" if item.get('city') else base
        if slug in used_slugs:
            slug = f"{base}-{item['_sourceId']}"
        item['slug'] = slug
        used_slugs.add(slug)
        for field in ['_sourceId', '_quality', '_nameKey']:
            item.pop(field, None)

    header = """import type { Area } from './areas'\n\n// Static location records generated from Los Angeles County's public GIS directories.\n// Sources: County Parks and Open Space plus the LMS Arts and Recreation layers.\n// Retrieved 2026-11-14. Verify current hours, access, and conditions before visiting.\nexport const EXTRA_AREAS: Area[] = """
    OUT.write_text(header + json.dumps(selected, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'candidates': len(candidates), 'unique': len(unique), 'selected': len(selected), 'byCategory': {c: sum(x['category'] == c for x in selected) for c in CATEGORY_ORDER}, 'byRegion': {r: sum(x['region'] == r for x in selected) for r in REGION_ORDER}, 'output': str(OUT)}, indent=2))


if __name__ == '__main__':
    main()
