const fallbackScope = {};
const spamJobsByScope = new WeakMap();

function resolveSpamScope(scope) {
    if (!scope || typeof scope !== 'object') {
        return fallbackScope;
    }

    if (scope.channels && scope.users && scope.ws) {
        return scope;
    }

    if (scope.client && typeof scope.client === 'object') {
        return scope.client;
    }

    if (scope.channel?.client && typeof scope.channel.client === 'object') {
        return scope.channel.client;
    }

    return fallbackScope;
}

function getExistingSpamJobSet(scope) {
    const scopeKey = resolveSpamScope(scope);
    return spamJobsByScope.get(scopeKey) || null;
}

function getOrCreateSpamJobSet(scope) {
    const scopeKey = resolveSpamScope(scope);

    if (!spamJobsByScope.has(scopeKey)) {
        spamJobsByScope.set(scopeKey, new Set());
    }

    return spamJobsByScope.get(scopeKey);
}

function createSpamJob(scope) {
    const scopeKey = resolveSpamScope(scope);
    const controller = new AbortController();
    const job = {
        controller,
        release: () => {}
    };

    const jobSet = getOrCreateSpamJobSet(scopeKey);
    jobSet.add(job);

    let released = false;

    const release = () => {
        if (released) {
            return;
        }

        released = true;
        const set = spamJobsByScope.get(scopeKey);
        if (!set) {
            return;
        }

        set.delete(job);
        if (set.size === 0) {
            spamJobsByScope.delete(scopeKey);
        }
    };

    job.release = release;

    const cancel = () => {
        if (!controller.signal.aborted) {
            controller.abort();
        }
    };

    return {
        cancel,
        release,
        signal: controller.signal
    };
}

function stopSpamJobs(scope) {
    const jobSet = getExistingSpamJobSet(scope);
    if (!jobSet) {
        return 0;
    }

    let stoppedCount = 0;

    for (const job of jobSet) {
        if (!job.controller.signal.aborted) {
            job.controller.abort();
            stoppedCount += 1;
        }

        job.release();
    }

    return stoppedCount;
}

function getSpamJobCount(scope) {
    return getExistingSpamJobSet(scope)?.size || 0;
}

module.exports = {
    createSpamJob,
    getSpamJobCount,
    stopSpamJobs
};
