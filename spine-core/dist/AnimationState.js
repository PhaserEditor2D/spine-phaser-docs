/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated July 28, 2023. Replaces all prior versions.
 *
 * Copyright (c) 2013-2023, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software or
 * otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THE
 * SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import { Animation, MixBlend, AttachmentTimeline, MixDirection, RotateTimeline, DrawOrderTimeline, Timeline, EventTimeline } from "./Animation";
import { StringSet, Pool, Utils, MathUtils } from "./Utils";
/** Applies animations over time, queues animations for later playback, mixes (crossfading) between animations, and applies
 * multiple animations on top of each other (layering).
 *
 * See [Applying Animations](http://esotericsoftware.com/spine-applying-animations/) in the Spine Runtimes Guide. */
export class AnimationState {
    static emptyAnimation() {
        return AnimationState._emptyAnimation;
    }
    constructor(data) {
        /** The list of tracks that currently have animations, which may contain null entries. */
        this.tracks = new Array();
        /** Multiplier for the delta time when the animation state is updated, causing time for all animations and mixes to play slower
         * or faster. Defaults to 1.
         *
         * See TrackEntry {@link TrackEntry#timeScale} for affecting a single animation. */
        this.timeScale = 1;
        this.unkeyedState = 0;
        this.events = new Array();
        this.listeners = new Array();
        this.queue = new EventQueue(this);
        this.propertyIDs = new StringSet();
        this.animationsChanged = false;
        this.trackEntryPool = new Pool(() => new TrackEntry());
        this.data = data;
    }
    /** Increments each track entry {@link TrackEntry#trackTime()}, setting queued animations as current if needed. */
    update(delta) {
        delta *= this.timeScale;
        let tracks = this.tracks;
        for (let i = 0, n = tracks.length; i < n; i++) {
            let current = tracks[i];
            if (!current)
                continue;
            current.animationLast = current.nextAnimationLast;
            current.trackLast = current.nextTrackLast;
            let currentDelta = delta * current.timeScale;
            if (current.delay > 0) {
                current.delay -= currentDelta;
                if (current.delay > 0)
                    continue;
                currentDelta = -current.delay;
                current.delay = 0;
            }
            let next = current.next;
            if (next) {
                // When the next entry's delay is passed, change to the next entry, preserving leftover time.
                let nextTime = current.trackLast - next.delay;
                if (nextTime >= 0) {
                    next.delay = 0;
                    next.trackTime += current.timeScale == 0 ? 0 : (nextTime / current.timeScale + delta) * next.timeScale;
                    current.trackTime += currentDelta;
                    this.setCurrent(i, next, true);
                    while (next.mixingFrom) {
                        next.mixTime += delta;
                        next = next.mixingFrom;
                    }
                    continue;
                }
            }
            else if (current.trackLast >= current.trackEnd && !current.mixingFrom) {
                tracks[i] = null;
                this.queue.end(current);
                this.clearNext(current);
                continue;
            }
            if (current.mixingFrom && this.updateMixingFrom(current, delta)) {
                // End mixing from entries once all have completed.
                let from = current.mixingFrom;
                current.mixingFrom = null;
                if (from)
                    from.mixingTo = null;
                while (from) {
                    this.queue.end(from);
                    from = from.mixingFrom;
                }
            }
            current.trackTime += currentDelta;
        }
        this.queue.drain();
    }
    /** Returns true when all mixing from entries are complete. */
    updateMixingFrom(to, delta) {
        let from = to.mixingFrom;
        if (!from)
            return true;
        let finished = this.updateMixingFrom(from, delta);
        from.animationLast = from.nextAnimationLast;
        from.trackLast = from.nextTrackLast;
        // Require mixTime > 0 to ensure the mixing from entry was applied at least once.
        if (to.mixTime > 0 && to.mixTime >= to.mixDuration) {
            // Require totalAlpha == 0 to ensure mixing is complete, unless mixDuration == 0 (the transition is a single frame).
            if (from.totalAlpha == 0 || to.mixDuration == 0) {
                to.mixingFrom = from.mixingFrom;
                if (from.mixingFrom)
                    from.mixingFrom.mixingTo = to;
                to.interruptAlpha = from.interruptAlpha;
                this.queue.end(from);
            }
            return finished;
        }
        from.trackTime += delta * from.timeScale;
        to.mixTime += delta;
        return false;
    }
    /** Poses the skeleton using the track entry animations. There are no side effects other than invoking listeners, so the
     * animation state can be applied to multiple skeletons to pose them identically.
     * @returns True if any animations were applied. */
    apply(skeleton) {
        if (!skeleton)
            throw new Error("skeleton cannot be null.");
        if (this.animationsChanged)
            this._animationsChanged();
        let events = this.events;
        let tracks = this.tracks;
        let applied = false;
        for (let i = 0, n = tracks.length; i < n; i++) {
            let current = tracks[i];
            if (!current || current.delay > 0)
                continue;
            applied = true;
            let blend = i == 0 ? MixBlend.first : current.mixBlend;
            // Apply mixing from entries first.
            let mix = current.alpha;
            if (current.mixingFrom)
                mix *= this.applyMixingFrom(current, skeleton, blend);
            else if (current.trackTime >= current.trackEnd && !current.next)
                mix = 0;
            // Apply current entry.
            let animationLast = current.animationLast, animationTime = current.getAnimationTime(), applyTime = animationTime;
            let applyEvents = events;
            if (current.reverse) {
                applyTime = current.animation.duration - applyTime;
                applyEvents = null;
            }
            let timelines = current.animation.timelines;
            let timelineCount = timelines.length;
            if ((i == 0 && mix == 1) || blend == MixBlend.add) {
                for (let ii = 0; ii < timelineCount; ii++) {
                    // Fixes issue #302 on IOS9 where mix, blend sometimes became undefined and caused assets
                    // to sometimes stop rendering when using color correction, as their RGBA values become NaN.
                    // (https://github.com/pixijs/pixi-spine/issues/302)
                    Utils.webkit602BugfixHelper(mix, blend);
                    var timeline = timelines[ii];
                    if (timeline instanceof AttachmentTimeline)
                        this.applyAttachmentTimeline(timeline, skeleton, applyTime, blend, true);
                    else
                        timeline.apply(skeleton, animationLast, applyTime, applyEvents, mix, blend, MixDirection.mixIn);
                }
            }
            else {
                let timelineMode = current.timelineMode;
                let shortestRotation = current.shortestRotation;
                let firstFrame = !shortestRotation && current.timelinesRotation.length != timelineCount << 1;
                if (firstFrame)
                    current.timelinesRotation.length = timelineCount << 1;
                for (let ii = 0; ii < timelineCount; ii++) {
                    let timeline = timelines[ii];
                    let timelineBlend = timelineMode[ii] == SUBSEQUENT ? blend : MixBlend.setup;
                    if (!shortestRotation && timeline instanceof RotateTimeline) {
                        this.applyRotateTimeline(timeline, skeleton, applyTime, mix, timelineBlend, current.timelinesRotation, ii << 1, firstFrame);
                    }
                    else if (timeline instanceof AttachmentTimeline) {
                        this.applyAttachmentTimeline(timeline, skeleton, applyTime, blend, true);
                    }
                    else {
                        // This fixes the WebKit 602 specific issue described at http://esotericsoftware.com/forum/iOS-10-disappearing-graphics-10109
                        Utils.webkit602BugfixHelper(mix, blend);
                        timeline.apply(skeleton, animationLast, applyTime, applyEvents, mix, timelineBlend, MixDirection.mixIn);
                    }
                }
            }
            this.queueEvents(current, animationTime);
            events.length = 0;
            current.nextAnimationLast = animationTime;
            current.nextTrackLast = current.trackTime;
        }
        // Set slots attachments to the setup pose, if needed. This occurs if an animation that is mixing out sets attachments so
        // subsequent timelines see any deform, but the subsequent timelines don't set an attachment (eg they are also mixing out or
        // the time is before the first key).
        var setupState = this.unkeyedState + SETUP;
        var slots = skeleton.slots;
        for (var i = 0, n = skeleton.slots.length; i < n; i++) {
            var slot = slots[i];
            if (slot.attachmentState == setupState) {
                var attachmentName = slot.data.attachmentName;
                slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(slot.data.index, attachmentName));
            }
        }
        this.unkeyedState += 2; // Increasing after each use avoids the need to reset attachmentState for every slot.
        this.queue.drain();
        return applied;
    }
    applyMixingFrom(to, skeleton, blend) {
        let from = to.mixingFrom;
        if (from.mixingFrom)
            this.applyMixingFrom(from, skeleton, blend);
        let mix = 0;
        if (to.mixDuration == 0) { // Single frame mix to undo mixingFrom changes.
            mix = 1;
            if (blend == MixBlend.first)
                blend = MixBlend.setup;
        }
        else {
            mix = to.mixTime / to.mixDuration;
            if (mix > 1)
                mix = 1;
            if (blend != MixBlend.first)
                blend = from.mixBlend;
        }
        let attachments = mix < from.attachmentThreshold, drawOrder = mix < from.drawOrderThreshold;
        let timelines = from.animation.timelines;
        let timelineCount = timelines.length;
        let alphaHold = from.alpha * to.interruptAlpha, alphaMix = alphaHold * (1 - mix);
        let animationLast = from.animationLast, animationTime = from.getAnimationTime(), applyTime = animationTime;
        let events = null;
        if (from.reverse)
            applyTime = from.animation.duration - applyTime;
        else if (mix < from.eventThreshold)
            events = this.events;
        if (blend == MixBlend.add) {
            for (let i = 0; i < timelineCount; i++)
                timelines[i].apply(skeleton, animationLast, applyTime, events, alphaMix, blend, MixDirection.mixOut);
        }
        else {
            let timelineMode = from.timelineMode;
            let timelineHoldMix = from.timelineHoldMix;
            let shortestRotation = from.shortestRotation;
            let firstFrame = !shortestRotation && from.timelinesRotation.length != timelineCount << 1;
            if (firstFrame)
                from.timelinesRotation.length = timelineCount << 1;
            from.totalAlpha = 0;
            for (let i = 0; i < timelineCount; i++) {
                let timeline = timelines[i];
                let direction = MixDirection.mixOut;
                let timelineBlend;
                let alpha = 0;
                switch (timelineMode[i]) {
                    case SUBSEQUENT:
                        if (!drawOrder && timeline instanceof DrawOrderTimeline)
                            continue;
                        timelineBlend = blend;
                        alpha = alphaMix;
                        break;
                    case FIRST:
                        timelineBlend = MixBlend.setup;
                        alpha = alphaMix;
                        break;
                    case HOLD_SUBSEQUENT:
                        timelineBlend = blend;
                        alpha = alphaHold;
                        break;
                    case HOLD_FIRST:
                        timelineBlend = MixBlend.setup;
                        alpha = alphaHold;
                        break;
                    default:
                        timelineBlend = MixBlend.setup;
                        let holdMix = timelineHoldMix[i];
                        alpha = alphaHold * Math.max(0, 1 - holdMix.mixTime / holdMix.mixDuration);
                        break;
                }
                from.totalAlpha += alpha;
                if (!shortestRotation && timeline instanceof RotateTimeline)
                    this.applyRotateTimeline(timeline, skeleton, applyTime, alpha, timelineBlend, from.timelinesRotation, i << 1, firstFrame);
                else if (timeline instanceof AttachmentTimeline)
                    this.applyAttachmentTimeline(timeline, skeleton, applyTime, timelineBlend, attachments);
                else {
                    // This fixes the WebKit 602 specific issue described at http://esotericsoftware.com/forum/iOS-10-disappearing-graphics-10109
                    Utils.webkit602BugfixHelper(alpha, blend);
                    if (drawOrder && timeline instanceof DrawOrderTimeline && timelineBlend == MixBlend.setup)
                        direction = MixDirection.mixIn;
                    timeline.apply(skeleton, animationLast, applyTime, events, alpha, timelineBlend, direction);
                }
            }
        }
        if (to.mixDuration > 0)
            this.queueEvents(from, animationTime);
        this.events.length = 0;
        from.nextAnimationLast = animationTime;
        from.nextTrackLast = from.trackTime;
        return mix;
    }
    applyAttachmentTimeline(timeline, skeleton, time, blend, attachments) {
        var slot = skeleton.slots[timeline.slotIndex];
        if (!slot.bone.active)
            return;
        if (time < timeline.frames[0]) { // Time is before first frame.
            if (blend == MixBlend.setup || blend == MixBlend.first)
                this.setAttachment(skeleton, slot, slot.data.attachmentName, attachments);
        }
        else
            this.setAttachment(skeleton, slot, timeline.attachmentNames[Timeline.search1(timeline.frames, time)], attachments);
        // If an attachment wasn't set (ie before the first frame or attachments is false), set the setup attachment later.
        if (slot.attachmentState <= this.unkeyedState)
            slot.attachmentState = this.unkeyedState + SETUP;
    }
    setAttachment(skeleton, slot, attachmentName, attachments) {
        slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(slot.data.index, attachmentName));
        if (attachments)
            slot.attachmentState = this.unkeyedState + CURRENT;
    }
    applyRotateTimeline(timeline, skeleton, time, alpha, blend, timelinesRotation, i, firstFrame) {
        if (firstFrame)
            timelinesRotation[i] = 0;
        if (alpha == 1) {
            timeline.apply(skeleton, 0, time, null, 1, blend, MixDirection.mixIn);
            return;
        }
        let bone = skeleton.bones[timeline.boneIndex];
        if (!bone.active)
            return;
        let frames = timeline.frames;
        let r1 = 0, r2 = 0;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.rotation = bone.data.rotation;
                default:
                    return;
                case MixBlend.first:
                    r1 = bone.rotation;
                    r2 = bone.data.rotation;
            }
        }
        else {
            r1 = blend == MixBlend.setup ? bone.data.rotation : bone.rotation;
            r2 = bone.data.rotation + timeline.getCurveValue(time);
        }
        // Mix between rotations using the direction of the shortest route on the first frame while detecting crosses.
        let total = 0, diff = r2 - r1;
        diff -= (16384 - ((16384.499999999996 - diff / 360) | 0)) * 360;
        if (diff == 0) {
            total = timelinesRotation[i];
        }
        else {
            let lastTotal = 0, lastDiff = 0;
            if (firstFrame) {
                lastTotal = 0;
                lastDiff = diff;
            }
            else {
                lastTotal = timelinesRotation[i]; // Angle and direction of mix, including loops.
                lastDiff = timelinesRotation[i + 1]; // Difference between bones.
            }
            let current = diff > 0, dir = lastTotal >= 0;
            // Detect cross at 0 (not 180).
            if (MathUtils.signum(lastDiff) != MathUtils.signum(diff) && Math.abs(lastDiff) <= 90) {
                // A cross after a 360 rotation is a loop.
                if (Math.abs(lastTotal) > 180)
                    lastTotal += 360 * MathUtils.signum(lastTotal);
                dir = current;
            }
            total = diff + lastTotal - lastTotal % 360; // Store loops as part of lastTotal.
            if (dir != current)
                total += 360 * MathUtils.signum(lastTotal);
            timelinesRotation[i] = total;
        }
        timelinesRotation[i + 1] = diff;
        bone.rotation = r1 + total * alpha;
    }
    queueEvents(entry, animationTime) {
        let animationStart = entry.animationStart, animationEnd = entry.animationEnd;
        let duration = animationEnd - animationStart;
        let trackLastWrapped = entry.trackLast % duration;
        // Queue events before complete.
        let events = this.events;
        let i = 0, n = events.length;
        for (; i < n; i++) {
            let event = events[i];
            if (event.time < trackLastWrapped)
                break;
            if (event.time > animationEnd)
                continue; // Discard events outside animation start/end.
            this.queue.event(entry, event);
        }
        // Queue complete if completed a loop iteration or the animation.
        let complete = false;
        if (entry.loop)
            complete = duration == 0 || trackLastWrapped > entry.trackTime % duration;
        else
            complete = animationTime >= animationEnd && entry.animationLast < animationEnd;
        if (complete)
            this.queue.complete(entry);
        // Queue events after complete.
        for (; i < n; i++) {
            let event = events[i];
            if (event.time < animationStart)
                continue; // Discard events outside animation start/end.
            this.queue.event(entry, event);
        }
    }
    /** Removes all animations from all tracks, leaving skeletons in their current pose.
     *
     * It may be desired to use {@link AnimationState#setEmptyAnimation()} to mix the skeletons back to the setup pose,
     * rather than leaving them in their current pose. */
    clearTracks() {
        let oldDrainDisabled = this.queue.drainDisabled;
        this.queue.drainDisabled = true;
        for (let i = 0, n = this.tracks.length; i < n; i++)
            this.clearTrack(i);
        this.tracks.length = 0;
        this.queue.drainDisabled = oldDrainDisabled;
        this.queue.drain();
    }
    /** Removes all animations from the track, leaving skeletons in their current pose.
     *
     * It may be desired to use {@link AnimationState#setEmptyAnimation()} to mix the skeletons back to the setup pose,
     * rather than leaving them in their current pose. */
    clearTrack(trackIndex) {
        if (trackIndex >= this.tracks.length)
            return;
        let current = this.tracks[trackIndex];
        if (!current)
            return;
        this.queue.end(current);
        this.clearNext(current);
        let entry = current;
        while (true) {
            let from = entry.mixingFrom;
            if (!from)
                break;
            this.queue.end(from);
            entry.mixingFrom = null;
            entry.mixingTo = null;
            entry = from;
        }
        this.tracks[current.trackIndex] = null;
        this.queue.drain();
    }
    setCurrent(index, current, interrupt) {
        let from = this.expandToIndex(index);
        this.tracks[index] = current;
        current.previous = null;
        if (from) {
            if (interrupt)
                this.queue.interrupt(from);
            current.mixingFrom = from;
            from.mixingTo = current;
            current.mixTime = 0;
            // Store the interrupted mix percentage.
            if (from.mixingFrom && from.mixDuration > 0)
                current.interruptAlpha *= Math.min(1, from.mixTime / from.mixDuration);
            from.timelinesRotation.length = 0; // Reset rotation for mixing out, in case entry was mixed in.
        }
        this.queue.start(current);
    }
    /** Sets an animation by name.
      *
      * See {@link #setAnimationWith()}. */
    setAnimation(trackIndex, animationName, loop = false) {
        let animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation)
            throw new Error("Animation not found: " + animationName);
        return this.setAnimationWith(trackIndex, animation, loop);
    }
    /** Sets the current animation for a track, discarding any queued animations. If the formerly current track entry was never
     * applied to a skeleton, it is replaced (not mixed from).
     * @param loop If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
     *           duration. In either case {@link TrackEntry#trackEnd} determines when the track is cleared.
     * @returns A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener#dispose()} event occurs. */
    setAnimationWith(trackIndex, animation, loop = false) {
        if (!animation)
            throw new Error("animation cannot be null.");
        let interrupt = true;
        let current = this.expandToIndex(trackIndex);
        if (current) {
            if (current.nextTrackLast == -1) {
                // Don't mix from an entry that was never applied.
                this.tracks[trackIndex] = current.mixingFrom;
                this.queue.interrupt(current);
                this.queue.end(current);
                this.clearNext(current);
                current = current.mixingFrom;
                interrupt = false;
            }
            else
                this.clearNext(current);
        }
        let entry = this.trackEntry(trackIndex, animation, loop, current);
        this.setCurrent(trackIndex, entry, interrupt);
        this.queue.drain();
        return entry;
    }
    /** Queues an animation by name.
     *
     * See {@link #addAnimationWith()}. */
    addAnimation(trackIndex, animationName, loop = false, delay = 0) {
        let animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation)
            throw new Error("Animation not found: " + animationName);
        return this.addAnimationWith(trackIndex, animation, loop, delay);
    }
    /** Adds an animation to be played after the current or last queued animation for a track. If the track is empty, it is
     * equivalent to calling {@link #setAnimationWith()}.
     * @param delay If > 0, sets {@link TrackEntry#delay}. If <= 0, the delay set is the duration of the previous track entry
     *           minus any mix duration (from the {@link AnimationStateData}) plus the specified `delay` (ie the mix
     *           ends at (`delay` = 0) or before (`delay` < 0) the previous track entry duration). If the
     *           previous entry is looping, its next loop completion is used instead of its duration.
     * @returns A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener#dispose()} event occurs. */
    addAnimationWith(trackIndex, animation, loop = false, delay = 0) {
        if (!animation)
            throw new Error("animation cannot be null.");
        let last = this.expandToIndex(trackIndex);
        if (last) {
            while (last.next)
                last = last.next;
        }
        let entry = this.trackEntry(trackIndex, animation, loop, last);
        if (!last) {
            this.setCurrent(trackIndex, entry, true);
            this.queue.drain();
        }
        else {
            last.next = entry;
            entry.previous = last;
            if (delay <= 0)
                delay += last.getTrackComplete() - entry.mixDuration;
        }
        entry.delay = delay;
        return entry;
    }
    /** Sets an empty animation for a track, discarding any queued animations, and sets the track entry's
     * {@link TrackEntry#mixduration}. An empty animation has no timelines and serves as a placeholder for mixing in or out.
     *
     * Mixing out is done by setting an empty animation with a mix duration using either {@link #setEmptyAnimation()},
     * {@link #setEmptyAnimations()}, or {@link #addEmptyAnimation()}. Mixing to an empty animation causes
     * the previous animation to be applied less and less over the mix duration. Properties keyed in the previous animation
     * transition to the value from lower tracks or to the setup pose value if no lower tracks key the property. A mix duration of
     * 0 still mixes out over one frame.
     *
     * Mixing in is done by first setting an empty animation, then adding an animation using
     * {@link #addAnimation()} and on the returned track entry, set the
     * {@link TrackEntry#setMixDuration()}. Mixing from an empty animation causes the new animation to be applied more and
     * more over the mix duration. Properties keyed in the new animation transition from the value from lower tracks or from the
     * setup pose value if no lower tracks key the property to the value keyed in the new animation. */
    setEmptyAnimation(trackIndex, mixDuration = 0) {
        let entry = this.setAnimationWith(trackIndex, AnimationState.emptyAnimation(), false);
        entry.mixDuration = mixDuration;
        entry.trackEnd = mixDuration;
        return entry;
    }
    /** Adds an empty animation to be played after the current or last queued animation for a track, and sets the track entry's
     * {@link TrackEntry#mixDuration}. If the track is empty, it is equivalent to calling
     * {@link #setEmptyAnimation()}.
     *
     * See {@link #setEmptyAnimation()}.
     * @param delay If > 0, sets {@link TrackEntry#delay}. If <= 0, the delay set is the duration of the previous track entry
     *           minus any mix duration plus the specified `delay` (ie the mix ends at (`delay` = 0) or
     *           before (`delay` < 0) the previous track entry duration). If the previous entry is looping, its next
     *           loop completion is used instead of its duration.
     * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener#dispose()} event occurs. */
    addEmptyAnimation(trackIndex, mixDuration = 0, delay = 0) {
        let entry = this.addAnimationWith(trackIndex, AnimationState.emptyAnimation(), false, delay);
        if (delay <= 0)
            entry.delay += entry.mixDuration - mixDuration;
        entry.mixDuration = mixDuration;
        entry.trackEnd = mixDuration;
        return entry;
    }
    /** Sets an empty animation for every track, discarding any queued animations, and mixes to it over the specified mix
      * duration. */
    setEmptyAnimations(mixDuration = 0) {
        let oldDrainDisabled = this.queue.drainDisabled;
        this.queue.drainDisabled = true;
        for (let i = 0, n = this.tracks.length; i < n; i++) {
            let current = this.tracks[i];
            if (current)
                this.setEmptyAnimation(current.trackIndex, mixDuration);
        }
        this.queue.drainDisabled = oldDrainDisabled;
        this.queue.drain();
    }
    expandToIndex(index) {
        if (index < this.tracks.length)
            return this.tracks[index];
        Utils.ensureArrayCapacity(this.tracks, index + 1, null);
        this.tracks.length = index + 1;
        return null;
    }
    /** @param last May be null. */
    trackEntry(trackIndex, animation, loop, last) {
        let entry = this.trackEntryPool.obtain();
        entry.reset();
        entry.trackIndex = trackIndex;
        entry.animation = animation;
        entry.loop = loop;
        entry.holdPrevious = false;
        entry.reverse = false;
        entry.shortestRotation = false;
        entry.eventThreshold = 0;
        entry.attachmentThreshold = 0;
        entry.drawOrderThreshold = 0;
        entry.animationStart = 0;
        entry.animationEnd = animation.duration;
        entry.animationLast = -1;
        entry.nextAnimationLast = -1;
        entry.delay = 0;
        entry.trackTime = 0;
        entry.trackLast = -1;
        entry.nextTrackLast = -1;
        entry.trackEnd = Number.MAX_VALUE;
        entry.timeScale = 1;
        entry.alpha = 1;
        entry.mixTime = 0;
        entry.mixDuration = !last ? 0 : this.data.getMix(last.animation, animation);
        entry.interruptAlpha = 1;
        entry.totalAlpha = 0;
        entry.mixBlend = MixBlend.replace;
        return entry;
    }
    /** Removes the {@link TrackEntry#getNext() next entry} and all entries after it for the specified entry. */
    clearNext(entry) {
        let next = entry.next;
        while (next) {
            this.queue.dispose(next);
            next = next.next;
        }
        entry.next = null;
    }
    _animationsChanged() {
        this.animationsChanged = false;
        this.propertyIDs.clear();
        let tracks = this.tracks;
        for (let i = 0, n = tracks.length; i < n; i++) {
            let entry = tracks[i];
            if (!entry)
                continue;
            while (entry.mixingFrom)
                entry = entry.mixingFrom;
            do {
                if (!entry.mixingTo || entry.mixBlend != MixBlend.add)
                    this.computeHold(entry);
                entry = entry.mixingTo;
            } while (entry);
        }
    }
    computeHold(entry) {
        let to = entry.mixingTo;
        let timelines = entry.animation.timelines;
        let timelinesCount = entry.animation.timelines.length;
        let timelineMode = entry.timelineMode;
        timelineMode.length = timelinesCount;
        let timelineHoldMix = entry.timelineHoldMix;
        timelineHoldMix.length = 0;
        let propertyIDs = this.propertyIDs;
        if (to && to.holdPrevious) {
            for (let i = 0; i < timelinesCount; i++)
                timelineMode[i] = propertyIDs.addAll(timelines[i].getPropertyIds()) ? HOLD_FIRST : HOLD_SUBSEQUENT;
            return;
        }
        outer: for (let i = 0; i < timelinesCount; i++) {
            let timeline = timelines[i];
            let ids = timeline.getPropertyIds();
            if (!propertyIDs.addAll(ids))
                timelineMode[i] = SUBSEQUENT;
            else if (!to || timeline instanceof AttachmentTimeline || timeline instanceof DrawOrderTimeline
                || timeline instanceof EventTimeline || !to.animation.hasTimeline(ids)) {
                timelineMode[i] = FIRST;
            }
            else {
                for (let next = to.mixingTo; next; next = next.mixingTo) {
                    if (next.animation.hasTimeline(ids))
                        continue;
                    if (entry.mixDuration > 0) {
                        timelineMode[i] = HOLD_MIX;
                        timelineHoldMix[i] = next;
                        continue outer;
                    }
                    break;
                }
                timelineMode[i] = HOLD_FIRST;
            }
        }
    }
    /** Returns the track entry for the animation currently playing on the track, or null if no animation is currently playing. */
    getCurrent(trackIndex) {
        if (trackIndex >= this.tracks.length)
            return null;
        return this.tracks[trackIndex];
    }
    /** Adds a listener to receive events for all track entries. */
    addListener(listener) {
        if (!listener)
            throw new Error("listener cannot be null.");
        this.listeners.push(listener);
    }
    /** Removes the listener added with {@link #addListener()}. */
    removeListener(listener) {
        let index = this.listeners.indexOf(listener);
        if (index >= 0)
            this.listeners.splice(index, 1);
    }
    /** Removes all listeners added with {@link #addListener()}. */
    clearListeners() {
        this.listeners.length = 0;
    }
    /** Discards all listener notifications that have not yet been delivered. This can be useful to call from an
     * {@link AnimationStateListener} when it is known that further notifications that may have been already queued for delivery
     * are not wanted because new animations are being set. */
    clearListenerNotifications() {
        this.queue.clear();
    }
}
AnimationState._emptyAnimation = new Animation("<empty>", [], 0);
/** Stores settings and other state for the playback of an animation on an {@link AnimationState} track.
 *
 * References to a track entry must not be kept after the {@link AnimationStateListener#dispose()} event occurs. */
export class TrackEntry {
    constructor() {
        /** The animation to apply for this track entry. */
        this.animation = null;
        this.previous = null;
        /** The animation queued to start after this animation, or null. `next` makes up a linked list. */
        this.next = null;
        /** The track entry for the previous animation when mixing from the previous animation to this animation, or null if no
         * mixing is currently occuring. When mixing from multiple animations, `mixingFrom` makes up a linked list. */
        this.mixingFrom = null;
        /** The track entry for the next animation when mixing from this animation to the next animation, or null if no mixing is
         * currently occuring. When mixing to multiple animations, `mixingTo` makes up a linked list. */
        this.mixingTo = null;
        /** The listener for events generated by this track entry, or null.
         *
         * A track entry returned from {@link AnimationState#setAnimation()} is already the current animation
         * for the track, so the track entry listener {@link AnimationStateListener#start()} will not be called. */
        this.listener = null;
        /** The index of the track where this track entry is either current or queued.
         *
         * See {@link AnimationState#getCurrent()}. */
        this.trackIndex = 0;
        /** If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
         * duration. */
        this.loop = false;
        /** If true, when mixing from the previous animation to this animation, the previous animation is applied as normal instead
         * of being mixed out.
         *
         * When mixing between animations that key the same property, if a lower track also keys that property then the value will
         * briefly dip toward the lower track value during the mix. This happens because the first animation mixes from 100% to 0%
         * while the second animation mixes from 0% to 100%. Setting `holdPrevious` to true applies the first animation
         * at 100% during the mix so the lower track value is overwritten. Such dipping does not occur on the lowest track which
         * keys the property, only when a higher track also keys the property.
         *
         * Snapping will occur if `holdPrevious` is true and this animation does not key all the same properties as the
         * previous animation. */
        this.holdPrevious = false;
        this.reverse = false;
        this.shortestRotation = false;
        /** When the mix percentage ({@link #mixTime} / {@link #mixDuration}) is less than the
         * `eventThreshold`, event timelines are applied while this animation is being mixed out. Defaults to 0, so event
         * timelines are not applied while this animation is being mixed out. */
        this.eventThreshold = 0;
        /** When the mix percentage ({@link #mixtime} / {@link #mixDuration}) is less than the
         * `attachmentThreshold`, attachment timelines are applied while this animation is being mixed out. Defaults to
         * 0, so attachment timelines are not applied while this animation is being mixed out. */
        this.attachmentThreshold = 0;
        /** When the mix percentage ({@link #mixTime} / {@link #mixDuration}) is less than the
         * `drawOrderThreshold`, draw order timelines are applied while this animation is being mixed out. Defaults to 0,
         * so draw order timelines are not applied while this animation is being mixed out. */
        this.drawOrderThreshold = 0;
        /** Seconds when this animation starts, both initially and after looping. Defaults to 0.
         *
         * When changing the `animationStart` time, it often makes sense to set {@link #animationLast} to the same
         * value to prevent timeline keys before the start time from triggering. */
        this.animationStart = 0;
        /** Seconds for the last frame of this animation. Non-looping animations won't play past this time. Looping animations will
         * loop back to {@link #animationStart} at this time. Defaults to the animation {@link Animation#duration}. */
        this.animationEnd = 0;
        /** The time in seconds this animation was last applied. Some timelines use this for one-time triggers. Eg, when this
         * animation is applied, event timelines will fire all events between the `animationLast` time (exclusive) and
         * `animationTime` (inclusive). Defaults to -1 to ensure triggers on frame 0 happen the first time this animation
         * is applied. */
        this.animationLast = 0;
        this.nextAnimationLast = 0;
        /** Seconds to postpone playing the animation. When this track entry is the current track entry, `delay`
         * postpones incrementing the {@link #trackTime}. When this track entry is queued, `delay` is the time from
         * the start of the previous animation to when this track entry will become the current track entry (ie when the previous
         * track entry {@link TrackEntry#trackTime} >= this track entry's `delay`).
         *
         * {@link #timeScale} affects the delay. */
        this.delay = 0;
        /** Current time in seconds this track entry has been the current track entry. The track time determines
         * {@link #animationTime}. The track time can be set to start the animation at a time other than 0, without affecting
         * looping. */
        this.trackTime = 0;
        this.trackLast = 0;
        this.nextTrackLast = 0;
        /** The track time in seconds when this animation will be removed from the track. Defaults to the highest possible float
         * value, meaning the animation will be applied until a new animation is set or the track is cleared. If the track end time
         * is reached, no other animations are queued for playback, and mixing from any previous animations is complete, then the
         * properties keyed by the animation are set to the setup pose and the track is cleared.
         *
         * It may be desired to use {@link AnimationState#addEmptyAnimation()} rather than have the animation
         * abruptly cease being applied. */
        this.trackEnd = 0;
        /** Multiplier for the delta time when this track entry is updated, causing time for this animation to pass slower or
         * faster. Defaults to 1.
         *
         * {@link #mixTime} is not affected by track entry time scale, so {@link #mixDuration} may need to be adjusted to
         * match the animation speed.
         *
         * When using {@link AnimationState#addAnimation()} with a `delay` <= 0, note the
         * {@link #delay} is set using the mix duration from the {@link AnimationStateData}, assuming time scale to be 1. If
         * the time scale is not 1, the delay may need to be adjusted.
         *
         * See AnimationState {@link AnimationState#timeScale} for affecting all animations. */
        this.timeScale = 0;
        /** Values < 1 mix this animation with the skeleton's current pose (usually the pose resulting from lower tracks). Defaults
         * to 1, which overwrites the skeleton's current pose with this animation.
         *
         * Typically track 0 is used to completely pose the skeleton, then alpha is used on higher tracks. It doesn't make sense to
         * use alpha on track 0 if the skeleton pose is from the last frame render. */
        this.alpha = 0;
        /** Seconds from 0 to the {@link #getMixDuration()} when mixing from the previous animation to this animation. May be
         * slightly more than `mixDuration` when the mix is complete. */
        this.mixTime = 0;
        /** Seconds for mixing from the previous animation to this animation. Defaults to the value provided by AnimationStateData
         * {@link AnimationStateData#getMix()} based on the animation before this animation (if any).
         *
         * A mix duration of 0 still mixes out over one frame to provide the track entry being mixed out a chance to revert the
         * properties it was animating.
         *
         * The `mixDuration` can be set manually rather than use the value from
         * {@link AnimationStateData#getMix()}. In that case, the `mixDuration` can be set for a new
         * track entry only before {@link AnimationState#update(float)} is first called.
         *
         * When using {@link AnimationState#addAnimation()} with a `delay` <= 0, note the
         * {@link #delay} is set using the mix duration from the {@link AnimationStateData}, not a mix duration set
         * afterward. */
        this.mixDuration = 0;
        this.interruptAlpha = 0;
        this.totalAlpha = 0;
        /** Controls how properties keyed in the animation are mixed with lower tracks. Defaults to {@link MixBlend#replace}, which
         * replaces the values from the lower tracks with the animation values. {@link MixBlend#add} adds the animation values to
         * the values from the lower tracks.
         *
         * The `mixBlend` can be set for a new track entry only before {@link AnimationState#apply()} is first
         * called. */
        this.mixBlend = MixBlend.replace;
        this.timelineMode = new Array();
        this.timelineHoldMix = new Array();
        this.timelinesRotation = new Array();
    }
    reset() {
        this.next = null;
        this.previous = null;
        this.mixingFrom = null;
        this.mixingTo = null;
        this.animation = null;
        this.listener = null;
        this.timelineMode.length = 0;
        this.timelineHoldMix.length = 0;
        this.timelinesRotation.length = 0;
    }
    /** Uses {@link #trackTime} to compute the `animationTime`, which is between {@link #animationStart}
     * and {@link #animationEnd}. When the `trackTime` is 0, the `animationTime` is equal to the
     * `animationStart` time. */
    getAnimationTime() {
        if (this.loop) {
            let duration = this.animationEnd - this.animationStart;
            if (duration == 0)
                return this.animationStart;
            return (this.trackTime % duration) + this.animationStart;
        }
        return Math.min(this.trackTime + this.animationStart, this.animationEnd);
    }
    setAnimationLast(animationLast) {
        this.animationLast = animationLast;
        this.nextAnimationLast = animationLast;
    }
    /** Returns true if at least one loop has been completed.
     *
     * See {@link AnimationStateListener#complete()}. */
    isComplete() {
        return this.trackTime >= this.animationEnd - this.animationStart;
    }
    /** Resets the rotation directions for mixing this entry's rotate timelines. This can be useful to avoid bones rotating the
     * long way around when using {@link #alpha} and starting animations on other tracks.
     *
     * Mixing with {@link MixBlend#replace} involves finding a rotation between two others, which has two possible solutions:
     * the short way or the long way around. The two rotations likely change over time, so which direction is the short or long
     * way also changes. If the short way was always chosen, bones would flip to the other side when that direction became the
     * long way. TrackEntry chooses the short way the first time it is applied and remembers that direction. */
    resetRotationDirections() {
        this.timelinesRotation.length = 0;
    }
    getTrackComplete() {
        let duration = this.animationEnd - this.animationStart;
        if (duration != 0) {
            if (this.loop)
                return duration * (1 + ((this.trackTime / duration) | 0)); // Completion of next loop.
            if (this.trackTime < duration)
                return duration; // Before duration.
        }
        return this.trackTime; // Next update.
    }
}
export class EventQueue {
    constructor(animState) {
        this.objects = [];
        this.drainDisabled = false;
        this.animState = animState;
    }
    start(entry) {
        this.objects.push(EventType.start);
        this.objects.push(entry);
        this.animState.animationsChanged = true;
    }
    interrupt(entry) {
        this.objects.push(EventType.interrupt);
        this.objects.push(entry);
    }
    end(entry) {
        this.objects.push(EventType.end);
        this.objects.push(entry);
        this.animState.animationsChanged = true;
    }
    dispose(entry) {
        this.objects.push(EventType.dispose);
        this.objects.push(entry);
    }
    complete(entry) {
        this.objects.push(EventType.complete);
        this.objects.push(entry);
    }
    event(entry, event) {
        this.objects.push(EventType.event);
        this.objects.push(entry);
        this.objects.push(event);
    }
    drain() {
        if (this.drainDisabled)
            return;
        this.drainDisabled = true;
        let objects = this.objects;
        let listeners = this.animState.listeners;
        for (let i = 0; i < objects.length; i += 2) {
            let type = objects[i];
            let entry = objects[i + 1];
            switch (type) {
                case EventType.start:
                    if (entry.listener && entry.listener.start)
                        entry.listener.start(entry);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.start)
                            listener.start(entry);
                    }
                    break;
                case EventType.interrupt:
                    if (entry.listener && entry.listener.interrupt)
                        entry.listener.interrupt(entry);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.interrupt)
                            listener.interrupt(entry);
                    }
                    break;
                case EventType.end:
                    if (entry.listener && entry.listener.end)
                        entry.listener.end(entry);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.end)
                            listener.end(entry);
                    }
                // Fall through.
                case EventType.dispose:
                    if (entry.listener && entry.listener.dispose)
                        entry.listener.dispose(entry);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.dispose)
                            listener.dispose(entry);
                    }
                    this.animState.trackEntryPool.free(entry);
                    break;
                case EventType.complete:
                    if (entry.listener && entry.listener.complete)
                        entry.listener.complete(entry);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.complete)
                            listener.complete(entry);
                    }
                    break;
                case EventType.event:
                    let event = objects[i++ + 2];
                    if (entry.listener && entry.listener.event)
                        entry.listener.event(entry, event);
                    for (let ii = 0; ii < listeners.length; ii++) {
                        let listener = listeners[ii];
                        if (listener.event)
                            listener.event(entry, event);
                    }
                    break;
            }
        }
        this.clear();
        this.drainDisabled = false;
    }
    clear() {
        this.objects.length = 0;
    }
}
export var EventType;
(function (EventType) {
    EventType[EventType["start"] = 0] = "start";
    EventType[EventType["interrupt"] = 1] = "interrupt";
    EventType[EventType["end"] = 2] = "end";
    EventType[EventType["dispose"] = 3] = "dispose";
    EventType[EventType["complete"] = 4] = "complete";
    EventType[EventType["event"] = 5] = "event";
})(EventType || (EventType = {}));
export class AnimationStateAdapter {
    start(entry) {
    }
    interrupt(entry) {
    }
    end(entry) {
    }
    dispose(entry) {
    }
    complete(entry) {
    }
    event(entry, event) {
    }
}
/** 1. A previously applied timeline has set this property.
 *
 * Result: Mix from the current pose to the timeline pose. */
export const SUBSEQUENT = 0;
/** 1. This is the first timeline to set this property.
 * 2. The next track entry applied after this one does not have a timeline to set this property.
 *
 * Result: Mix from the setup pose to the timeline pose. */
export const FIRST = 1;
/** 1) A previously applied timeline has set this property.<br>
 * 2) The next track entry to be applied does have a timeline to set this property.<br>
 * 3) The next track entry after that one does not have a timeline to set this property.<br>
 * Result: Mix from the current pose to the timeline pose, but do not mix out. This avoids "dipping" when crossfading
 * animations that key the same property. A subsequent timeline will set this property using a mix. */
export const HOLD_SUBSEQUENT = 2;
/** 1) This is the first timeline to set this property.<br>
 * 2) The next track entry to be applied does have a timeline to set this property.<br>
 * 3) The next track entry after that one does not have a timeline to set this property.<br>
 * Result: Mix from the setup pose to the timeline pose, but do not mix out. This avoids "dipping" when crossfading animations
 * that key the same property. A subsequent timeline will set this property using a mix. */
export const HOLD_FIRST = 3;
/** 1. This is the first timeline to set this property.
 * 2. The next track entry to be applied does have a timeline to set this property.
 * 3. The next track entry after that one does have a timeline to set this property.
 * 4. timelineHoldMix stores the first subsequent track entry that does not have a timeline to set this property.
 *
 * Result: The same as HOLD except the mix percentage from the timelineHoldMix track entry is used. This handles when more than
 * 2 track entries in a row have a timeline that sets the same property.
 *
 * Eg, A -> B -> C -> D where A, B, and C have a timeline setting same property, but D does not. When A is applied, to avoid
 * "dipping" A is not mixed out, however D (the first entry that doesn't set the property) mixing in is used to mix out A
 * (which affects B and C). Without using D to mix out, A would be applied fully until mixing completes, then snap into
 * place. */
export const HOLD_MIX = 4;
export const SETUP = 1;
export const CURRENT = 2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQW5pbWF0aW9uU3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvQW5pbWF0aW9uU3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRS9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUloSixPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBSTVEOzs7b0hBR29IO0FBQ3BILE1BQU0sT0FBTyxjQUFjO0lBRWxCLE1BQU0sQ0FBQyxjQUFjO1FBQzVCLE9BQU8sY0FBYyxDQUFDLGVBQWUsQ0FBQztJQUN2QyxDQUFDO0lBdUJELFlBQWEsSUFBd0I7UUFsQnJDLHlGQUF5RjtRQUN6RixXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQXFCLENBQUM7UUFFeEM7OzsyRkFHbUY7UUFDbkYsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLGlCQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRWpCLFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBUyxDQUFDO1FBQzVCLGNBQVMsR0FBRyxJQUFJLEtBQUssRUFBMEIsQ0FBQztRQUNoRCxVQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsZ0JBQVcsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzlCLHNCQUFpQixHQUFHLEtBQUssQ0FBQztRQUUxQixtQkFBYyxHQUFHLElBQUksSUFBSSxDQUFhLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUMsQ0FBQztRQUc3RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsa0hBQWtIO0lBQ2xILE1B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