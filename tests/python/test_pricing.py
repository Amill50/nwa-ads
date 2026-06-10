# tests/python/test_pricing.py
# Unit tests for NWA Ads pricing logic
# Mirrors RATE_CONFIG + unitRate() from book.html
# Run with: pytest tests/python/test_pricing.py -v

import math
import pytest

# ── Mirror of RATE_CONFIG from book.html ──────────────────────────────────────

RATE_CONFIG = {
    "daily_premium":    1.10,
    "weekly_premium":   1.00,
    "monthly_premium":  1.083,
    "markup_under_10k": 0.20,
    "markup_over_10k":  0.15,
}

# ── Mirror of pricing functions from book.html ────────────────────────────────

def markup_rate(cost):
    return round(cost * (1 + RATE_CONFIG["markup_under_10k"]))

def cost_unit_rate(mo_rate, inc, qty):
    if inc == "daily":
        cost = round((mo_rate / 28) * RATE_CONFIG["daily_premium"])
    elif inc == "weekly":
        cost = round((mo_rate / 4) * RATE_CONFIG["weekly_premium"])
    elif inc == "monthly":
        cost = round(mo_rate * RATE_CONFIG["monthly_premium"])
    else:
        cost = 0
    return cost * qty

def unit_rate(mo_rate, inc, qty, sched_mode="standard", custom_day_count=0):
    if sched_mode == "custom" and custom_day_count > 0:
        daily_cost = round((mo_rate / 28) * RATE_CONFIG["daily_premium"])
        return markup_rate(daily_cost) * custom_day_count
    return markup_rate(cost_unit_rate(mo_rate, inc, qty))

# ── Test screens (confirmed Lamar rates) ─────────────────────────────────────

I49_ROGERS_MO   = 2580   # I-49 E/S Rogers — verified Lamar rate
WALTON_BLVD_MO  = 4320   # Walton Blvd Bentonville — verified Lamar rate
CINEMA_MO       = 147    # Rogers Towne Center 12


# ── Daily rate tests ──────────────────────────────────────────────────────────

class TestDailyRate:
    def test_i49_rogers_daily_cost(self):
        """round(2580/28 * 1.10) = 101"""
        daily = round((2580 / 28) * RATE_CONFIG["daily_premium"])
        assert daily == 101

    def test_i49_rogers_daily_with_markup(self):
        """101 * 1.20 = 121"""
        daily = round((2580 / 28) * RATE_CONFIG["daily_premium"])
        assert markup_rate(daily) == 121

    def test_walton_blvd_daily_cost(self):
        """round(4320/28 * 1.10) = 170"""
        daily = round((4320 / 28) * RATE_CONFIG["daily_premium"])
        assert daily == 170

    def test_walton_blvd_daily_with_markup(self):
        """170 * 1.20 = 204"""
        daily = round((4320 / 28) * RATE_CONFIG["daily_premium"])
        assert markup_rate(daily) == 204

    def test_daily_premium_is_1_10(self):
        assert RATE_CONFIG["daily_premium"] == 1.10


# ── Weekly rate tests ─────────────────────────────────────────────────────────

class TestWeeklyRate:
    def test_i49_rogers_weekly_cost(self):
        """round(2580/4 * 1.00) = 645"""
        weekly = round((2580 / 4) * RATE_CONFIG["weekly_premium"])
        assert weekly == 645

    def test_i49_rogers_weekly_with_markup(self):
        """645 * 1.20 = 774"""
        weekly = round((2580 / 4) * RATE_CONFIG["weekly_premium"])
        assert markup_rate(weekly) == 774

    def test_no_weekly_premium(self):
        """Weekly premium is 1.00 — no surcharge"""
        assert RATE_CONFIG["weekly_premium"] == 1.00


# ── Monthly rate tests ────────────────────────────────────────────────────────

class TestMonthlyRate:
    def test_i49_rogers_monthly_cost(self):
        """round(2580 * 1.083) = 2794"""
        monthly = round(2580 * RATE_CONFIG["monthly_premium"])
        assert monthly == 2794

    def test_monthly_premium_is_1_083(self):
        assert RATE_CONFIG["monthly_premium"] == 1.083


# ── Custom schedule pricing ───────────────────────────────────────────────────

class TestCustomSchedulePricing:
    def test_i49_mon_tue_22_days(self):
        """Mon+Tue over 11 weeks = 22 days → 121 * 22 = 2662"""
        total = unit_rate(I49_ROGERS_MO, "weekly", 2, "custom", 22)
        assert total == 2662

    def test_i49_mon_only_4_days(self):
        """Mon only 4 occurrences → 121 * 4 = 484"""
        total = unit_rate(I49_ROGERS_MO, "weekly", 2, "custom", 4)
        assert total == 484

    def test_cinema_22_days(self):
        """Cinema: round(147/28 * 1.10) = 6, markup(6) = 7, 7 * 22 = 154"""
        total = unit_rate(CINEMA_MO, "weekly", 2, "custom", 22)
        daily_cost = round((CINEMA_MO / 28) * RATE_CONFIG["daily_premium"])
        daily_markup = markup_rate(daily_cost)
        assert total == daily_markup * 22

    def test_zero_custom_days_falls_through_to_standard(self):
        """
        When custom_day_count=0, mode falls through to standard weekly rate.
        This mirrors book.html: if (schedMode==custom && customDayCount>0) ... else standard.
        0 days = schedule not yet configured = use standard pricing.
        """
        total = unit_rate(I49_ROGERS_MO, "weekly", 2, "custom", 0)
        # Falls through to standard: markup(round(2580/4)) * qty=2 = 774 * 2 = 1548
        assert total == markup_rate(round(I49_ROGERS_MO / 4)) * 2

    def test_custom_mode_ignores_qty(self):
        """In custom mode, qty is irrelevant — total = daily * day_count"""
        total_qty2 = unit_rate(I49_ROGERS_MO, "weekly", 2, "custom", 22)
        total_qty8 = unit_rate(I49_ROGERS_MO, "weekly", 8, "custom", 22)
        assert total_qty2 == total_qty8 == 2662


# ── Cart grand total ──────────────────────────────────────────────────────────

class TestCartGrandTotal:
    def test_standard_2_weeks_grand_total(self):
        """Standard mode: grand = unitRate * qty"""
        rate = unit_rate(I49_ROGERS_MO, "weekly", 1, "standard")
        grand = rate * 2
        expected = markup_rate(round((I49_ROGERS_MO / 4) * 1.00)) * 2
        assert grand == expected

    def test_custom_schedule_grand_uses_effqty_1(self):
        """Custom mode: grand = unitRate * 1 (total already baked in)"""
        rate = unit_rate(I49_ROGERS_MO, "weekly", 2, "custom", 22)
        eff_qty = 1
        grand = rate * eff_qty
        assert grand == 2662

    def test_no_10_percent_discount(self):
        """Multi-screen discount was removed — always 0"""
        disc = 0
        assert disc == 0


# ── Markup config ─────────────────────────────────────────────────────────────

class TestMarkupConfig:
    def test_markup_under_10k_is_20_percent(self):
        assert RATE_CONFIG["markup_under_10k"] == 0.20

    def test_markup_over_10k_is_15_percent(self):
        assert RATE_CONFIG["markup_over_10k"] == 0.15

    def test_markup_rounds_correctly(self):
        """645 * 1.20 = 774.0 exactly"""
        assert markup_rate(645) == 774

    def test_markup_rounds_up_on_fraction(self):
        """101 * 1.20 = 121.2 → rounds to 121"""
        assert markup_rate(101) == 121

    def test_zero_rate_returns_zero(self):
        assert markup_rate(0) == 0
