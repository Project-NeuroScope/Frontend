import { Layer, Layer1D, Layer2D, Convert2DTo1D,
         FlattenLayer } from '@/models/Layer';
import { Paper, Typography, Box, Button } from '@mui/material';
import * as Blockly from 'blockly';

// Type guards for layer interfaces
export function isLayer2D(layer: Layer): layer is Layer & Layer2D {
  return 'width' in layer && 'height' in layer;
}

export function isLayer1D(layer: Layer): layer is Layer & Layer1D {
  return 'dimension' in layer;
}

export function isConvert2DTo1D(layer: Layer): layer is Layer & Convert2DTo1D {
  return layer instanceof FlattenLayer;
}

interface NetworkInfoPanelProps {
  networkLayers: Layer[];
  selectedBlock: Blockly.Block | null;
  validationErrors: string[];
  onDownloadArchitecture: () => void;
}

export default function NetworkInfoPanel({
  networkLayers,
  selectedBlock,
  validationErrors,
  onDownloadArchitecture
}: NetworkInfoPanelProps) {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: 'calc(100vh - 100px)', 
        overflow: 'auto',
        p: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        网络信息
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
            onClick={onDownloadArchitecture}
            sx={{ mt: 2 }}
          >
            下载网络结构
          </Button>

          {validationErrors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" color="error">校验错误</Typography>
              {validationErrors.map((error, index) => (
                <Typography key={index} variant="body2" color="error">
                  • {error}
                </Typography>
              ))}
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body1">
          添加神经网络层以查看网络信息
        </Typography>
      )}
      
      {selectedBlock && (
        <Box sx={{ mt: 4, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            当前层
          </Typography>
          <Typography variant="body2">
            类型 {selectedBlock.type.replace('_layer', '').toUpperCase()}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            维度
            {selectedBlock.type === 'flatten_layer' ? ' 转换 2D → 1D' :
             (selectedBlock.type === 'input_layer' || 
              selectedBlock.type === 'conv2d_layer' || 
              selectedBlock.type === 'pooling_layer') ? ' 2D' : ' 1D'}
          </Typography>
          
        </Box>
      )}
    </Paper>
  );
}