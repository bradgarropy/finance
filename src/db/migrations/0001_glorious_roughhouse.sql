PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`checking_baseline_cents` integer NOT NULL,
	`emergency_baseline_cents` integer NOT NULL,
	`excess_invest_pct` integer NOT NULL,
	`excess_save_pct` integer NOT NULL,
	`default_window` integer NOT NULL,
	CONSTRAINT "settings_id_check" CHECK("__new_settings"."id" = 1),
	CONSTRAINT "settings_checking_baseline_cents_check" CHECK("__new_settings"."checking_baseline_cents" >= 0),
	CONSTRAINT "settings_emergency_baseline_cents_check" CHECK("__new_settings"."emergency_baseline_cents" >= 0),
	CONSTRAINT "settings_excess_invest_pct_check" CHECK("__new_settings"."excess_invest_pct" between 0 and 100),
	CONSTRAINT "settings_excess_save_pct_check" CHECK("__new_settings"."excess_save_pct" between 0 and 100),
	CONSTRAINT "settings_excess_split_check" CHECK("__new_settings"."excess_invest_pct" + "__new_settings"."excess_save_pct" = 100),
	CONSTRAINT "settings_default_window_check" CHECK("__new_settings"."default_window" in (4, 12, 26, 52))
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "checking_baseline_cents", "emergency_baseline_cents", "excess_invest_pct", "excess_save_pct", "default_window") SELECT "id", "checking_baseline_cents", 0, "excess_invest_pct", "excess_save_pct", "default_window" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
