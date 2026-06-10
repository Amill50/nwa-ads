# tests/python/test_scheduling.py
# Unit tests for NWA Ads custom day-of-week scheduling logic
# Mirrors updateCustomSched() from book.html
# Run with: pytest tests/python/test_scheduling.py -v

from datetime import date, timedelta
import pytest


# ── Mirror of day-counting logic from book.html ───────────────────────────────

def count_custom_days(start_str, end_str, days):
    """
    Count days in [start, end] range that fall on any of `days`.
    days: list of integers 0=Sun, 1=Mon ... 6=Sat
    Returns 0 for invalid inputs.
    """
    if not start_str or not end_str or not days:
        return 0
    start = date.fromisoformat(start_str)
    end   = date.fromisoformat(end_str)
    if end < start:
        return 0
    count = 0
    cur = start
    while cur <= end:
        # Python weekday(): Mon=0 ... Sun=6
        # JS getDay():      Sun=0, Mon=1 ... Sat=6
        # Convert: JS_day = (python_weekday + 1) % 7
        js_day = (cur.weekday() + 1) % 7
        if js_day in days:
            count += 1
        cur += timedelta(days=1)
    return count


# ── Core acceptance criteria ──────────────────────────────────────────────────

class TestCoreAcceptanceCriteria:
    def test_mon_tue_11_weeks_equals_22_days(self):
        """
        UAT-confirmed: Mon(1)+Tue(2) from 2026-06-23 to 2026-09-07 = 22 days
        This is the primary acceptance test from the client UAT session.
        """
        count = count_custom_days("2026-06-23", "2026-09-07", [1, 2])
        assert count == 22

    def test_mon_only_11_weeks_equals_11_days(self):
        count = count_custom_days("2026-06-23", "2026-09-07", [1])
        assert count == 11

    def test_tue_only_11_weeks_equals_11_days(self):
        count = count_custom_days("2026-06-23", "2026-09-07", [2])
        assert count == 11


# ── Single day edge cases ─────────────────────────────────────────────────────

class TestSingleDayEdgeCases:
    def test_same_start_end_day_selected(self):
        """2026-06-22 is a Monday (JS day 1)"""
        count = count_custom_days("2026-06-22", "2026-06-22", [1])
        assert count == 1

    def test_same_start_end_day_not_selected(self):
        """2026-06-22 is Monday, selecting only Sunday (0)"""
        count = count_custom_days("2026-06-22", "2026-06-22", [0])
        assert count == 0

    def test_end_before_start_returns_zero(self):
        count = count_custom_days("2026-09-07", "2026-06-23", [1, 2])
        assert count == 0

    def test_no_days_selected_returns_zero(self):
        count = count_custom_days("2026-06-23", "2026-09-07", [])
        assert count == 0

    def test_no_start_date_returns_zero(self):
        count = count_custom_days(None, "2026-09-07", [1])
        assert count == 0

    def test_no_end_date_returns_zero(self):
        count = count_custom_days("2026-06-23", None, [1])
        assert count == 0

    def test_empty_start_string_returns_zero(self):
        count = count_custom_days("", "2026-09-07", [1])
        assert count == 0


# ── All days selected ─────────────────────────────────────────────────────────

class TestAllDaysSelected:
    def test_all_7_days_over_2_weeks_equals_14(self):
        count = count_custom_days("2026-06-15", "2026-06-28", [0, 1, 2, 3, 4, 5, 6])
        assert count == 14

    def test_weekdays_only_over_2_weeks_equals_10(self):
        """Mon-Fri = days 1-5"""
        count = count_custom_days("2026-06-15", "2026-06-28", [1, 2, 3, 4, 5])
        assert count == 10

    def test_weekends_only_over_2_weeks_equals_4(self):
        """Sat(6) + Sun(0)"""
        count = count_custom_days("2026-06-15", "2026-06-28", [0, 6])
        assert count == 4


# ── Longer windows ────────────────────────────────────────────────────────────

class TestLongerWindows:
    def test_every_day_full_year_range(self):
        """2026-01-05 to 2026-12-28 inclusive = 358 days"""
        count = count_custom_days("2026-01-05", "2026-12-28", [0, 1, 2, 3, 4, 5, 6])
        assert count == 358

    def test_every_monday_52_weeks(self):
        """2026-01-05 is a Monday — 52 Mondays in this range"""
        count = count_custom_days("2026-01-05", "2026-12-28", [1])
        assert count == 52

    def test_3_month_campaign_thu_only(self):
        """Every Thursday from 2026-07-01 to 2026-09-30"""
        count = count_custom_days("2026-07-01", "2026-09-30", [4])
        assert count == 13


# ── Summary line generation ───────────────────────────────────────────────────

class TestSummaryLine:
    DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    def test_mon_tue_summary_string(self):
        days = [1, 2]
        result = " + ".join(self.DAY_NAMES[d] for d in days)
        assert result == "Mon + Tue"

    def test_mon_only_summary_string(self):
        days = [1]
        result = " + ".join(self.DAY_NAMES[d] for d in days)
        assert result == "Mon"

    def test_all_weekdays_summary_string(self):
        days = [1, 2, 3, 4, 5]
        result = " + ".join(self.DAY_NAMES[d] for d in days)
        assert result == "Mon + Tue + Wed + Thu + Fri"

    def test_week_window_calculation(self):
        """2026-06-23 to 2026-09-07 = 11-week window"""
        start = date(2026, 6, 23)
        end   = date(2026, 9, 7)
        diff_days = (end - start).days
        weeks = math.ceil(diff_days / 7)
        assert weeks == 11

    def test_summary_full_string_format(self):
        """Full summary: 'Mon + Tue · 11 week window · 22 total ad days'"""
        days = [1, 2]
        day_count = 22
        weeks = 11
        selected = " + ".join(self.DAY_NAMES[d] for d in days)
        summary = f"{selected} · {weeks} week window · {day_count} total ad days"
        assert summary == "Mon + Tue · 11 week window · 22 total ad days"


# ── Needed import ─────────────────────────────────────────────────────────────
import math
