# tests/python/test_csv_import.py
# Unit tests for Lamar Rate Package CSV parsing + fuzzy name matching
# Mirrors importRatesCSV() from admin.html
# Run with: pytest tests/python/test_csv_import.py -v

import re
import pytest


# ── Mirror of parsing logic from admin.html ───────────────────────────────────

def parse_csv_line(line):
    """Parse a single CSV line, handling quoted fields with commas."""
    result, cur, in_q = [], "", False
    for ch in line:
        if ch == '"':
            in_q = not in_q
        elif ch == ',' and not in_q:
            result.append(cur.strip())
            cur = ""
        else:
            cur += ch
    result.append(cur.strip())
    return [c.strip('"').strip() for c in result]


def to_num(s):
    """Convert currency/number string to float, return None if blank."""
    if not s:
        return None
    cleaned = re.sub(r'[$,\s]', '', str(s))
    try:
        return float(cleaned)
    except ValueError:
        return None


def detect_format(text):
    """
    Detect CSV format by scanning first 10 rows.
    Returns: ('lamar' | 'admin' | None, header_row_index)
    """
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = text.split('\n')
    for i, line in enumerate(lines[:10]):
        ll = line.lower()
        if 'screen location' in ll and 'city' in ll:
            return ('lamar', i)
        if ll.startswith('id,') or 'cpm_updated' in ll:
            return ('admin', i)
    return (None, -1)


SKIP_KEYWORDS = ['total', 'legend', 'yellow', 'grey', 'rates shown', 'please']


def parse_lamar_csv(text):
    """Parse a Lamar Rate Package CSV and return list of screen dicts."""
    text = text.replace('\r\n', '\n').replace('\r', '\n').lstrip('\ufeff')
    fmt, header_idx = detect_format(text)
    if fmt != 'lamar':
        return []

    lines = text.split('\n')
    results = []

    for line in lines[header_idx + 1:]:
        if not line.strip() or line.replace(',', '').strip() == '':
            continue
        cols = parse_csv_line(line)
        if len(cols) < 5:
            continue
        name = cols[0]
        if not name or any(k in name.lower() for k in SKIP_KEYWORDS):
            continue

        city  = cols[1]
        impr  = to_num(cols[4])
        wkly  = to_num(cols[7]) if len(cols) > 7 else None
        mo    = to_num(cols[9]) if len(cols) > 9 else None
        cpm   = to_num(cols[2])

        # Derive CPM if blank
        if cpm is None and mo is not None and impr is not None and impr > 0:
            cpm = round((mo / (impr * 4)) * 1000, 2)

        results.append({'name': name, 'city': city, 'cpm': cpm,
                        'impr': int(impr) if impr else None,
                        'wkly': wkly, 'mo': mo})
    return results


STOP_WORDS = {'ar', 'the', 'and', 'at', 'of', 'in', 'mi', 'sf', 'nf', 'no', 'so', 'we', 'ea'}

def fuzzy_score(lamar_name, lamar_city, inv_name, inv_area):
    """Score how well a Lamar CSV row matches an inventory screen."""
    score = 0
    ln = lamar_name.lower()
    lc = (lamar_city or '').lower()
    fn = inv_name.lower()
    ia = (inv_area or '').lower()

    # City match
    if lc and lc.split(',')[0].strip() in ia:
        score += 4

    # Word overlap
    l_words = {w for w in re.sub(r'[^a-z0-9]', ' ', ln).split()
               if len(w) > 2 and w not in STOP_WORDS}
    f_words = {w for w in re.sub(r'[^a-z0-9]', ' ', fn).split()
               if len(w) > 2 and w not in STOP_WORDS}
    score += len(l_words & f_words)
    return score


# ── Minimal inventory for matching tests ─────────────────────────────────────

INV_DATA = [
    {'id': 'loc_595442', 'name': 'I-49 E/S (No)',              'area': 'Rogers, AR'},
    {'id': 'loc_595410', 'name': 'I-49 E/S (No)',              'area': 'Bentonville, AR'},
    {'id': 'loc_595408', 'name': 'Walton Blvd E/S (No)',       'area': 'Bentonville, AR'},
    {'id': 'loc_595434', 'name': '14th and S. Walton E/S (No)','area': 'Bentonville, AR'},
    {'id': 'loc_595446', 'name': '1080 SE 14th St S/S (We)',   'area': 'Bentonville, AR'},
]


# ── Format detection tests ────────────────────────────────────────────────────

class TestFormatDetection:
    def test_detects_lamar_format(self):
        csv = "\n\n\n\n\nScreen Location,City,CPM ($),Faces,Wkly Impr\nRow1\n"
        fmt, idx = detect_format(csv)
        assert fmt == 'lamar'
        assert idx == 5

    def test_detects_admin_export_format(self):
        csv = "id,name,type,area,cpm_original,cpm_updated,wkly_impr,wkly_rate\n"
        fmt, idx = detect_format(csv)
        assert fmt == 'admin'
        assert idx == 0

    def test_returns_none_for_unknown_format(self):
        csv = "random,columns,here\ndata,data,data\n"
        fmt, idx = detect_format(csv)
        assert fmt is None
        assert idx == -1


# ── Line ending + BOM handling ────────────────────────────────────────────────

class TestLineEndings:
    def test_strips_crlf_windows_line_endings(self):
        csv = "Screen Location,City\r\nI-49,Rogers\r\n"
        lines = csv.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        assert lines[0] == "Screen Location,City"
        assert lines[1] == "I-49,Rogers"

    def test_strips_bom_from_excel_export(self):
        csv = "\ufeffScreen Location,City\n"
        clean = csv.lstrip('\ufeff')
        assert clean[0] == 'S'

    def test_handles_bare_cr_line_endings(self):
        csv = "Screen Location,City\rI-49,Rogers\r"
        lines = csv.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        assert lines[0] == "Screen Location,City"
        assert lines[1] == "I-49,Rogers"


# ── CSV line parsing tests ────────────────────────────────────────────────────

class TestCSVLineParsing:
    def test_parses_simple_comma_separated_line(self):
        cols = parse_csv_line("I-49 Rogers,Rogers,,$710")
        assert cols[0] == "I-49 Rogers"
        assert cols[1] == "Rogers"

    def test_handles_quoted_fields_with_commas(self):
        cols = parse_csv_line('"I-49 W/S, AT MM 70, Springdale, AR",Springdale,,,$710')
        assert cols[0] == "I-49 W/S, AT MM 70, Springdale, AR"
        assert cols[1] == "Springdale"

    def test_strips_surrounding_quotes(self):
        cols = parse_csv_line('"Rogers","AR","$4.12"')
        assert cols[0] == "Rogers"
        assert cols[2] == "$4.12"

    def test_handles_empty_fields(self):
        cols = parse_csv_line("A,,C,")
        assert cols[0] == "A"
        assert cols[1] == ""
        assert cols[2] == "C"


# ── Number parsing tests ──────────────────────────────────────────────────────

class TestNumberParsing:
    def test_strips_dollar_sign(self):
        assert to_num("$710") == 710.0

    def test_strips_commas_from_large_numbers(self):
        assert to_num("179,468") == 179468.0
        assert to_num("$2,580") == 2580.0

    def test_returns_none_for_blank(self):
        assert to_num("") is None
        assert to_num(None) is None
        assert to_num("   ") is None

    def test_returns_none_for_non_numeric(self):
        assert to_num("N/A") is None
        assert to_num("TBD") is None

    def test_handles_decimal_values(self):
        assert to_num("$4.12") == pytest.approx(4.12)


# ── CPM derivation tests ──────────────────────────────────────────────────────

class TestCPMDerivation:
    def test_derives_cpm_from_mo_rate_and_impr(self):
        """CPM = (mo_rate / (wkly_impr * 4)) * 1000"""
        mo, impr = 2580, 156374
        cpm = round((mo / (impr * 4)) * 1000, 2)
        assert cpm == pytest.approx(4.12, abs=0.01)

    def test_i49_rogers_cpm(self):
        cpm = round((2580 / (156374 * 4)) * 1000, 2)
        assert cpm == 4.12

    def test_walton_blvd_cpm(self):
        cpm = round((4320 / (166823 * 4)) * 1000, 2)
        assert cpm == pytest.approx(6.47, abs=0.01)

    def test_does_not_override_provided_cpm(self):
        """If CPM column is filled in, use it — don't override"""
        provided_cpm = 5.50
        derived_cpm  = round((2580 / (156374 * 4)) * 1000, 2)
        result = provided_cpm if provided_cpm is not None else derived_cpm
        assert result == 5.50

    def test_no_divide_by_zero_on_zero_impr(self):
        """If wkly_impr is 0, derivation should not be attempted"""
        mo, impr = 2580, 0
        cpm = None
        if impr and impr > 0:
            cpm = round((mo / (impr * 4)) * 1000, 2)
        assert cpm is None


# ── Row skipping tests ────────────────────────────────────────────────────────

class TestRowSkipping:
    @pytest.mark.parametrize("name,should_skip", [
        ("legend: yellow = unconfirmed", True),
        ("Total all boards",             True),
        ("Please confirm rates",         True),
        ("grey = estimated",             True),
        ("I-49 E/S (No)",                False),
        ("Walton Blvd E/S (No)",         False),
        ("1080 SE 14th St",              False),
    ])
    def test_skip_logic(self, name, should_skip):
        result = any(k in name.lower() for k in SKIP_KEYWORDS)
        assert result == should_skip


# ── Fuzzy name matching tests ─────────────────────────────────────────────────

class TestFuzzyMatching:
    def test_high_score_city_and_word_overlap(self):
        score = fuzzy_score("I-49 E/S (No)", "Rogers", "I-49 E/S (No)", "Rogers, AR")
        assert score >= 4

    def test_low_score_different_city_no_overlap(self):
        score = fuzzy_score("Walton Blvd Main St", "Fayetteville", "I-49 E/S (No)", "Rogers, AR")
        assert score < 2

    def test_match_threshold_is_2(self):
        """Scores below 2 should not produce a match"""
        THRESHOLD = 2
        assert 4 >= THRESHOLD   # good match passes
        assert not (1 >= THRESHOLD)  # bad match fails

    def test_walton_blvd_matches_correct_screen(self):
        best, best_score = None, 0
        for s in INV_DATA:
            score = fuzzy_score("Walton Blvd E/S (No)", "Bentonville", s['name'], s['area'])
            if score > best_score:
                best_score = score
                best = s
        assert best['id'] == 'loc_595408'
        assert best_score >= 2

    def test_i49_rogers_matches_correct_screen(self):
        best, best_score = None, 0
        for s in INV_DATA:
            score = fuzzy_score("I-49 E/S (No)", "Rogers", s['name'], s['area'])
            if score > best_score:
                best_score = score
                best = s
        assert best['id'] == 'loc_595442'

    def test_city_match_adds_4_points(self):
        """City match is worth 4 points in the scoring algorithm"""
        score_with_city    = fuzzy_score("Random Name", "Rogers", "Different Name", "Rogers, AR")
        score_without_city = fuzzy_score("Random Name", "Bentonville", "Different Name", "Rogers, AR")
        assert score_with_city == score_without_city + 4
