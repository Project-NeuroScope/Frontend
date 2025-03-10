import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { Layer, Layer1D, Layer2D, Convert1DTo2D, Convert2DTo1D,
         InputLayer, Conv2dLayer, PoolingLayer, FlattenLayer, 
         DenseLayer, DropoutLayer, OutputLayer } from '@/models/Layer';
import { Button, Paper, TextField, FormControl, InputLabel, 
         Select, MenuItem, Typography, Box, Grid } from '@mui/material';
import Header from './Header';

// Type guards for layer interfaces (keep these for the model conversion logic)
function isLayer2D(layer: Layer): layer is Layer & Layer2D {
  return 'width' in layer && 'height' in layer;
}

function isLayer1D(layer: Layer): layer is Layer & Layer1D {
  return 'dimension' in layer;
}

function isConvert2DTo1D(layer: Layer): layer is Layer & Convert2DTo1D {
  return layer instanceof FlattenLayer;
}

function isConvert1DTo2D(layer: Layer): layer is Layer & Convert1DTo2D {
  return false; // Currently no layers implement this interface
}

export default function Canvas() {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Blockly.Block | null>(null);
  const [networkLayers, setNetworkLayers] = useState<Layer[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize Blockly workspace
  useEffect(() => {
    if (!blocklyDivRef.current) return;

    // Define custom blocks for neural network layers with appropriate connection types
    defineCustomBlocks();
    
    // Create the Blockly workspace
    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox: createToolbox(),
      trashcan: true,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true
      },
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3
      }
    });
    
    workspaceRef.current = workspace;
    
    // Add change listener to detect block selection and connections
    workspace.addChangeListener((event) => {
      if (event.type === Blockly.Events.SELECTED) {
        const eventCast = event as Blockly.Events.BlockBase;
        const blockId = eventCast.blockId && workspace.getBlockById(eventCast.blockId);
        setSelectedBlock(blockId || null);
        updateNetworkFromBlocks(workspace);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE || 
                 event.type === Blockly.Events.BLOCK_CREATE ||
                 event.type === Blockly.Events.BLOCK_DELETE ||
                 event.type === Blockly.Events.BLOCK_MOVE) {
        updateNetworkFromBlocks(workspace);
      }
    });

    // Cleanup function
    return () => {
      workspace.dispose();
    };
  }, []);

  // Define custom blocks with appropriate connection types
  const defineCustomBlocks = () => {
    // Input Layer - top layer, provides Layer2D downward
    Blockly.Blocks['input_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Input Layer")
            .appendField(new Blockly.FieldNumber(28, 1, 1000), "HEIGHT")
            .appendField("x")
            .appendField(new Blockly.FieldNumber(28, 1, 1000), "WIDTH")
            .appendField("x")
            .appendField(new Blockly.FieldNumber(3, 1, 100), "CHANNELS");
        this.appendDummyInput()
            .appendField("Batch Size:")
            .appendField(new Blockly.FieldNumber(32, 1), "BATCH_SIZE");
        // No previous statement, it's a top layer
        this.setPreviousStatement(false);
        this.setNextStatement(true, ["Layer2D"]); // Connect downward with Layer2D
        this.setColour(230);
        this.setTooltip("Input layer for the neural network");
      }
    };

    // Conv2D Layer - accepts Layer2D from above, provides Layer2D below
    Blockly.Blocks['conv2d_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Conv2D Layer")
            .appendField("Filters:")
            .appendField(new Blockly.FieldNumber(32, 1), "FILTERS")
            .appendField("Kernel:")
            .appendField(new Blockly.FieldNumber(3, 1), "KERNEL_SIZE");
        this.appendDummyInput()
            .appendField("Activation:")
            .appendField(new Blockly.FieldDropdown([
                ["ReLU", "relu"], 
                ["Sigmoid", "sigmoid"], 
                ["Tanh", "tanh"],
                ["None", "none"]
            ]), "ACTIVATION");
        this.setPreviousStatement(true, ["Layer2D"]); // Connect from above with Layer2D
        this.setNextStatement(true, ["Layer2D"]);     // Connect below with Layer2D
        this.setColour(160);
        this.setTooltip("2D Convolutional layer");
      }
    };

    // Pooling Layer - accepts Layer2D from above, provides Layer2D below
    Blockly.Blocks['pooling_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Pooling Layer")
            .appendField("Type:")
            .appendField(new Blockly.FieldDropdown([
                ["Max", "max"], 
                ["Average", "avg"]
            ]), "POOL_TYPE");
        this.appendDummyInput()
            .appendField("Size:")
            .appendField(new Blockly.FieldNumber(2, 1), "POOL_SIZE");
        this.setPreviousStatement(true, ["Layer2D"]); // Connect from above with Layer2D
        this.setNextStatement(true, ["Layer2D"]);     // Connect below with Layer2D
        this.setColour(90);
        this.setTooltip("Pooling layer (max or average)");
      }
    };

    // Flatten Layer - accepts Layer2D from above, provides Layer1D below
    Blockly.Blocks['flatten_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Flatten Layer")
            .appendField("Converts 2D to 1D");
        this.setPreviousStatement(true, ["Layer2D"]); // Connect from above with Layer2D
        this.setNextStatement(true, ["Layer1D"]);     // Connect below with Layer1D
        this.setColour(290);
        this.setTooltip("Flatten 2D/3D input to 1D");
      }
    };

    // Dense Layer - accepts Layer1D from above, provides Layer1D below
    Blockly.Blocks['dense_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Dense Layer")
            .appendField("Units:")
            .appendField(new Blockly.FieldNumber(128, 1), "UNITS");
        this.appendDummyInput()
            .appendField("Activation:")
            .appendField(new Blockly.FieldDropdown([
                ["ReLU", "relu"], 
                ["Sigmoid", "sigmoid"], 
                ["Tanh", "tanh"],
                ["None", "none"]
            ]), "ACTIVATION");
        this.setPreviousStatement(true, ["Layer1D"]); // Connect from above with Layer1D
        this.setNextStatement(true, ["Layer1D"]);     // Connect below with Layer1D
        this.setColour(60);
        this.setTooltip("Fully connected layer");
      }
    };

    // Dropout Layer - accepts Layer1D from above, provides Layer1D below
    Blockly.Blocks['dropout_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Dropout Layer")
            .appendField("Rate:")
            .appendField(new Blockly.FieldNumber(0.2, 0, 0.9, 0.1), "RATE");
        this.setPreviousStatement(true, ["Layer1D"]); // Connect from above with Layer1D
        this.setNextStatement(true, ["Layer1D"]);     // Connect below with Layer1D
        this.setColour(330);
        this.setTooltip("Dropout regularization layer");
      }
    };

    // Output Layer - accepts Layer1D from above, no connection below
    Blockly.Blocks['output_layer'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Output Layer")
            .appendField("Units:")
            .appendField(new Blockly.FieldNumber(10, 1), "UNITS");
        this.appendDummyInput()
            .appendField("Activation:")
            .appendField(new Blockly.FieldDropdown([
                ["Softmax", "softmax"], 
                ["Sigmoid", "sigmoid"], 
                ["Linear", "linear"]
            ]), "ACTIVATION");
        this.setPreviousStatement(true, ["Layer1D"]); // Connect from above with Layer1D
        this.setNextStatement(false);                // No connection below
        this.setColour(30);
        this.setTooltip("Output layer of the network");
      }
    };
  };

  // Create toolbox with all layer types
  const createToolbox = () => {
    return {
      kind: 'categoryToolbox',
      contents: [{
        kind: 'category',
        name: '2D Layers',
        colour: '#5C81A6',
        contents: [
          { kind: 'block', type: 'input_layer' },
          { kind: 'block', type: 'conv2d_layer' },
          { kind: 'block', type: 'pooling_layer' }
        ]
      }, {
        kind: 'category',
        name: 'Conversion Layers',
        colour: '#5CA65C',
        contents: [
          { kind: 'block', type: 'flatten_layer' }
        ]
      }, {
        kind: 'category',
        name: '1D Layers',
        colour: '#A65C81',
        contents: [
          { kind: 'block', type: 'dense_layer' },
          { kind: 'block', type: 'dropout_layer' },
          { kind: 'block', type: 'output_layer' }
        ]
      }]
    };
  };

  // Update the internal network representation based on blocks in workspace
  const updateNetworkFromBlocks = (workspace: Blockly.WorkspaceSvg) => {
    // Find input layers (these are the starting points of our networks)
    const blocks = workspace.getTopBlocks(false);
    const inputBlocks = blocks.filter(block => block.type === 'input_layer');
    
    if (inputBlocks.length === 0) {
      setNetworkLayers([]);
      setValidationErrors(["No input layer found. Start your network with an input layer."]);
      return;
    }
    
    const errors: string[] = [];
    const layers: Layer[] = [];
    
    // For each input block, trace the network downward
    // (in most cases there will just be one network, but this handles multiple networks)
    inputBlocks.forEach((inputBlock, networkIndex) => {
      // Start traversing from the input layer
      let currentBlock: Blockly.Block | null = inputBlock;
      const networkLayers: Layer[] = [];
      
      while (currentBlock) {
        // Convert block to layer object
        const layer = createLayerFromBlock(currentBlock);
        if (layer) {
          networkLayers.push(layer);
        }
        
        // Get the next block in the chain (the block connected below)
        currentBlock = currentBlock.getNextBlock();
      }
      
      // Only add complete networks (with output layers)
      if (networkLayers.length > 0) {
        const hasOutput = networkLayers.some(layer => layer instanceof OutputLayer);
        
        if (hasOutput) {
          layers.push(...networkLayers);
        } else {
          errors.push(`Network ${networkIndex + 1} does not have an output layer`);
        }
      }
    });
    
    // Set the state with our layers and any validation errors
    setNetworkLayers(layers);
    setValidationErrors(errors);
    
    // Perform validation for layer dimensionality consistency
    validateLayerDimensions(layers);
  };

  // Helper function to validate layer dimensions
  const validateLayerDimensions = (layers: Layer[]) => {
    const errors: string[] = [...validationErrors];
    
    // Check that layer connections make sense dimensionally
    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayer = layers[i];
      const nextLayer = layers[i + 1];
      
      // Check if 2D connects to 2D
      if (isLayer2D(currentLayer) && isLayer2D(nextLayer)) {
        // This is fine, 2D can connect to 2D
      }
      // Check if 1D connects to 1D
      else if (isLayer1D(currentLayer) && isLayer1D(nextLayer)) {
        // This is fine, 1D can connect to 1D
      }
      // Check if 2D connects to 1D via a conversion layer
      else if (isLayer2D(currentLayer) && isLayer1D(nextLayer)) {
        if (!isConvert2DTo1D(nextLayer)) {
        //   errors.push(`Cannot connect ${currentLayer.data.label} (2D) directly to ${nextLayer.data.label} (1D) without a Flatten layer`);
        }
      }
      // Check if 1D connects to 2D (currently not supported)
      else if (isLayer1D(currentLayer) && isLayer2D(nextLayer)) {
        errors.push(`Cannot connect ${currentLayer.data.label} (1D) to ${nextLayer.data.label} (2D). 1D to 2D conversion is not supported.`);
      }
    }
    
    setValidationErrors(errors);
  };

  // Create a layer object from a Blockly block
  const createLayerFromBlock = (block: Blockly.Block): Layer | null => {
    const position = { x: block.getRelativeToSurfaceXY().x, y: block.getRelativeToSurfaceXY().y };
    
    switch (block.type) {
      case 'input_layer':
        return new InputLayer(
          block.id,
          position,
          'Input Layer',
          Number(block.getFieldValue('HEIGHT')),
          Number(block.getFieldValue('WIDTH')),
          Number(block.getFieldValue('CHANNELS')),
          Number(block.getFieldValue('BATCH_SIZE')),
          'RGB'
        );
        
      case 'conv2d_layer':
        return new Conv2dLayer(
          block.id,
          position,
          'Conv2D Layer',
          0, // These will be calculated from previous layer
          0,
          Number(block.getFieldValue('FILTERS')),
          Number(block.getFieldValue('KERNEL_SIZE')),
          1, // stride
          'same', // padding
          block.getFieldValue('ACTIVATION')
        );
        
      case 'pooling_layer':
        return new PoolingLayer(
          block.id,
          position,
          'Pooling Layer',
          0, // These will be calculated from previous layer
          0, 
          Number(block.getFieldValue('POOL_SIZE')),
          Number(block.getFieldValue('POOL_SIZE')),
          block.getFieldValue('POOL_TYPE')
        );
        
      case 'flatten_layer':
        return new FlattenLayer(
          block.id,
          position,
          'Flatten Layer',
          0 // This will be calculated from previous layer
        );
        
      case 'dense_layer':
        return new DenseLayer(
          block.id,
          position,
          'Dense Layer',
          Number(block.getFieldValue('UNITS')),
          block.getFieldValue('ACTIVATION')
        );
        
      case 'dropout_layer':
        return new DropoutLayer(
          block.id,
          position,
          'Dropout Layer',
          Number(block.getFieldValue('RATE'))
        );
        
      case 'output_layer':
        return new OutputLayer(
          block.id,
          position,
          'Output Layer',
          Number(block.getFieldValue('UNITS')),
          block.getFieldValue('ACTIVATION')
        );
        
      default:
        return null;
    }
  };

  // Generate and download network architecture
  const downloadNetworkArchitecture = () => {
    if (networkLayers.length === 0) {
      alert("Please create a network first!");
      return;
    }

    // Generate JSON representation of the network
    const networkJson = JSON.stringify(networkLayers, null, 2);
    
    // Create and trigger download
    const blob = new Blob([networkJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural_network_architecture.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header/>
      <Grid container sx={{ flexGrow: 1 }}>
        {/* Main Blockly workspace */}
        <Grid item xs={8}>
          <div 
            ref={blocklyDivRef} 
            style={{ 
              width: '100%', 
              height: 'calc(100vh - 100px)'
            }}
          />
        </Grid>
        
        {/* Properties panel with layer type indicators */}
        <Grid item xs={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: 'calc(100vh - 100px)', 
              overflow: 'auto',
              p: 2
            }}
          >
            <Typography variant="h6" gutterBottom>
              Network Information
            </Typography>
            
            {networkLayers.length > 0 ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Layers: {networkLayers.length}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {networkLayers.map((layer, index) => (
                    <Paper 
                      key={layer.id}
                      elevation={1} 
                      sx={{ 
                        p: 1, 
                        mb: 1, 
                        bgcolor: isLayer2D(layer) ? '#e3f2fd' : 
                                 isLayer1D(layer) ? '#f3e5f5' : 
                                 isConvert2DTo1D(layer) ? '#e8f5e9' : '#fff8e1'
                      }}
                    >
                      <Typography variant="body2">
                        {index + 1}. {layer.data.label} 
                        {isLayer2D(layer) && ' (2D)'}
                        {isLayer1D(layer) && ' (1D)'}
                        {isConvert2DTo1D(layer) && ' (2D→1D)'}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={downloadNetworkArchitecture}
                  sx={{ mt: 2 }}
                >
                  Download Architecture
                </Button>
              </>
            ) : (
              <Typography variant="body1">
                No network created yet. Start by dragging an Input Layer from the toolbox.
              </Typography>
            )}
            
            {selectedBlock && (
              <Box sx={{ mt: 4, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Block Properties
                </Typography>
                <Typography variant="body2">
                  Type: {selectedBlock.type.replace('_layer', '').toUpperCase()}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Data Format: 
                  {selectedBlock.type === 'flatten_layer' ? ' Converts 2D → 1D' :
                   (selectedBlock.type === 'input_layer' || 
                    selectedBlock.type === 'conv2d_layer' || 
                    selectedBlock.type === 'pooling_layer') ? ' 2D' : ' 1D'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}