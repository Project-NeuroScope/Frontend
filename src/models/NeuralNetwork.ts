// This file contains the NeuralNetwork class
export type ModelDefinition = {
    metadata: {
        name: string;
        version: string;
        description: string;
        created_at: string;
    };
    dataset: {
        name: string;
    };
    hyperparameter: {
        optim: {
            name: string;
            params: Record<string, unknown>;
        };
        scheduler: {
            name: string;
            param: Record<string, unknown>;
        }
        loss: {
            name: string;
            param: Record<string, unknown>;
        };
        seed: number;
        epochs: number;
        early_stop: number;
        save_interval: number;
    };
    layers: Array<{
        name: string;
        type: string;
        params: Record<string, unknown>;
    }>;
};
