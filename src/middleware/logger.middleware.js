export const logOrderError = (scope, err) => {
    console.error(`[Orders:${scope}]`, {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
    });
};
