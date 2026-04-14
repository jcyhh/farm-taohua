import { Component, Label } from 'cc';
import { t } from '../Config/I18n';

const AUTO_MATCH_MIN_SECONDS = 8;
const AUTO_MATCH_MAX_SECONDS = 15;
const MANUAL_MATCH_TOTAL_SECONDS = 60;

export class BattleMatchTimers {
    private readonly host: Component;
    private readonly autoMatchLabel: Label | null;
    private readonly manualMatchLabel: Label | null;
    private readonly manualMatchMessageLabel: Label | null;

    private autoMatchElapsedSeconds = 0;
    private autoMatchTargetSeconds = 0;
    private autoMatchFinishedCallback: (() => void) | null = null;

    private manualMatchRemainingSeconds = MANUAL_MATCH_TOTAL_SECONDS;
    private manualInvitePhone = '';
    private manualInviteId: number | string | null = null;
    private manualMatchFinishedCallback: (() => void) | null = null;

    constructor(
        host: Component,
        autoMatchLabel: Label | null,
        manualMatchLabel: Label | null,
        manualMatchMessageLabel: Label | null,
    ) {
        this.host = host;
        this.autoMatchLabel = autoMatchLabel;
        this.manualMatchLabel = manualMatchLabel;
        this.manualMatchMessageLabel = manualMatchMessageLabel;
        this.updateAutoMatchLabel();
        this.updateManualMatchLabel();
        this.updateManualMatchMessage();
    }

    startAutoMatch(onFinished?: () => void) {
        this.stopAutoMatch(false);
        this.autoMatchElapsedSeconds = 0;
        this.autoMatchTargetSeconds = this.randomInt(AUTO_MATCH_MIN_SECONDS, AUTO_MATCH_MAX_SECONDS);
        this.autoMatchFinishedCallback = onFinished ?? null;
        this.updateAutoMatchLabel();
        this.host.schedule(this.handleAutoMatchTick, 1);
    }

    stopAutoMatch(resetLabel = true) {
        this.host.unschedule(this.handleAutoMatchTick);
        this.autoMatchElapsedSeconds = 0;
        this.autoMatchTargetSeconds = 0;
        this.autoMatchFinishedCallback = null;
        if (resetLabel) {
            this.updateAutoMatchLabel();
        }
    }

    startManualMatch(phone: string, inviteId: number | string, onFinished?: () => void) {
        this.stopManualMatch(false, false);
        this.manualInvitePhone = phone;
        this.manualInviteId = inviteId;
        this.manualMatchRemainingSeconds = MANUAL_MATCH_TOTAL_SECONDS;
        this.manualMatchFinishedCallback = onFinished ?? null;
        this.updateManualMatchLabel();
        this.updateManualMatchMessage();
        this.host.schedule(this.handleManualMatchTick, 1);
    }

    stopManualMatch(resetLabel = true, clearInviteState = true) {
        this.host.unschedule(this.handleManualMatchTick);
        this.manualMatchRemainingSeconds = MANUAL_MATCH_TOTAL_SECONDS;
        this.manualMatchFinishedCallback = null;
        if (clearInviteState) {
            this.manualInvitePhone = '';
            this.manualInviteId = null;
        }
        if (resetLabel) {
            this.updateManualMatchLabel();
        }
        this.updateManualMatchMessage();
    }

    getManualInviteId() {
        return this.manualInviteId;
    }

    destroy() {
        this.stopAutoMatch(false);
        this.stopManualMatch(false);
    }

    private readonly handleAutoMatchTick = () => {
        this.autoMatchElapsedSeconds += 1;
        this.updateAutoMatchLabel();
        if (this.autoMatchElapsedSeconds < this.autoMatchTargetSeconds) {
            return;
        }

        this.host.unschedule(this.handleAutoMatchTick);
        const finishedCallback = this.autoMatchFinishedCallback;
        this.autoMatchFinishedCallback = null;
        finishedCallback?.();
    };

    private readonly handleManualMatchTick = () => {
        this.manualMatchRemainingSeconds -= 1;
        this.updateManualMatchLabel();
        if (this.manualMatchRemainingSeconds > 0) {
            return;
        }

        this.host.unschedule(this.handleManualMatchTick);
        const finishedCallback = this.manualMatchFinishedCallback;
        this.manualMatchFinishedCallback = null;
        finishedCallback?.();
    };

    private updateAutoMatchLabel() {
        if (!this.autoMatchLabel?.isValid) {
            return;
        }
        this.autoMatchLabel.string = this.formatTime(this.autoMatchElapsedSeconds);
    }

    private updateManualMatchLabel() {
        if (!this.manualMatchLabel?.isValid) {
            return;
        }
        this.manualMatchLabel.string = this.formatTime(this.manualMatchRemainingSeconds);
    }

    private updateManualMatchMessage() {
        if (!this.manualMatchMessageLabel?.isValid) {
            return;
        }

        if (!this.manualInvitePhone) {
            this.manualMatchMessageLabel.string = '';
            return;
        }

        this.manualMatchMessageLabel.string = t('等待“{phone}”回应', {
            phone: this.maskPhone(this.manualInvitePhone),
        });
    }

    private formatTime(totalSeconds: number) {
        const safeSeconds = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${this.formatTwoDigits(minutes)}:${this.formatTwoDigits(seconds)}`;
    }

    private formatTwoDigits(value: number) {
        if (value >= 10) {
            return `${value}`;
        }
        return `0${value}`;
    }

    private maskPhone(phone: string) {
        if (phone.length < 7) {
            return phone;
        }
        return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
    }

    private randomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
