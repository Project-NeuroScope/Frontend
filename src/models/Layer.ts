// Class for a layer in the Neural Network


export interface Layer2D {
    width: number;
    height: number;
}


export interface Layer1D {
    dimension: number;
}

export interface Convert2DTo1D { }
export interface Convert1DTo2D { }

export type Activation = 'relu' | 'sigmoid' | 'tanh' | 'softmax';


export abstract class Layer {
    id: string;
    position: { x: number, y: number };
    data: { label: string };

    constructor(id: string, position: { x: number, y: number }, label: string) {
        this.id = id;
        this.position = position;
        this.data = { label: label };
    }
}

// InputLayer: denotes a image for the neural network
export class InputLayer extends Layer implements Layer2D {
    // properties of the image
    width: number;
    height: number;
    channels: number;  // typically 1 for grayscale, 3 for RGB
    batchSize: number; // number of images processed simultaneously
    format: 'RGB' | 'GRAYSCALE';  // color format of the image

    constructor(id: string, position: { x: number, y: number }, label: string, width: number, height: number, channels: number, batchSize: number, format: 'RGB' | 'GRAYSCALE') {
        super(id, position, label);
        this.width = width;
        this.height = height;
        this.channels = channels;
        this.batchSize = batchSize;
        this.format = format;
    }

}


export class FlattenLayer extends Layer implements Layer1D, Convert2DTo1D {
    dimension: number;

    constructor(id: string, position: { x: number, y: number }, label: string, dimension: number) {
        super(id, position, label);
        this.dimension = dimension;
    }

}
export class Conv2dLayer extends Layer implements Layer2D {
    width: number;
    height: number;
    kernelSize: number;
    filters: number;
    stride: number;
    padding: 'valid' | 'same';
    activation: Activation;

    constructor(id: string, position: { x: number, y: number }, label: string, width: number, height: number, kernelSize: number, filters: number, stride: number, padding: 'valid' | 'same', activation: Activation) {
        super(id, position, label);
        this.width = width;
        this.height = height;
        this.kernelSize = kernelSize;
        this.filters = filters;
        this.stride = stride;
        this.padding = padding;
        this.activation = activation;
    }

}

export class PoolingLayer extends Layer implements Layer2D {
    width: number;
    height: number;
    poolSize: number;
    stride: number;
    type: 'max' | 'average';

    constructor(id: string, position: { x: number, y: number }, label: string, width: number, height: number, poolSize: number, stride: number, type: 'max' | 'average') {
        super(id, position, label);
        this.width = width;
        this.height = height;
        this.poolSize = poolSize;
        this.stride = stride;
        this.type = type;
    }

}

export class DropoutLayer extends Layer {
    rate: number;

    constructor(id: string, position: { x: number, y: number }, label: string, rate: number) {
        super(id, position, label);
        this.rate = rate;
    }

}

export class OutputLayer extends Layer implements Layer1D {
    dimension: number;
    activation: 'softmax' | 'sigmoid';

    constructor(id: string, position: { x: number, y: number }, label: string, dimension: number, activation: 'softmax' | 'sigmoid') {
        super(id, position, label);
        this.dimension = dimension;
        this.activation = activation;
    }

}

export class DenseLayer extends Layer implements Layer1D {
    dimension: number;
    activation: 'relu' | 'sigmoid' | 'tanh';

    constructor(id: string, position: { x: number, y: number }, label: string, dimension: number, activation: 'relu' | 'sigmoid' | 'tanh') {
        super(id, position, label);
        this.dimension = dimension;
        this.activation = activation;
    }
}