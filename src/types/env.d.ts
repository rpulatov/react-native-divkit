declare namespace NodeJS {
    interface ProcessEnv {
        ENABLE_EXPRESSIONS?: string;
        [key: string]: string | undefined;
    }
}

// eslint-disable-next-line no-var
declare var process: {
    env: NodeJS.ProcessEnv;
};
