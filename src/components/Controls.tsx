import React, { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Zoom,
  Collapse,
  Typography
} from '@mui/material';
import {
  PlayArrow,
  FastForward,
  Pause,
  Save,
  Upload,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

interface ControlsProps {
  onTrainStep?: () => void;
  onTrainToEnd?: () => void;
  onPause?: () => void;
  onSave?: () => void;
  onLoad?: () => Promise<void> | void;
  isTraining?: boolean;
}

export default function Controls({
  onTrainStep,
  onTrainToEnd,
  onPause,
  onSave,
  onLoad,
  isTraining = false
}: ControlsProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        p: 1,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(5px)',
        transition: 'all 0.3s ease'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: expanded ? 1 : 0 
      }}>
        <Typography variant="subtitle2" sx={{ ml: 1 }}>Model Controls</Typography>
        <IconButton 
          size="small" 
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "collapse controls" : "expand controls"}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Train one step" placement="bottom" TransitionComponent={Zoom}>
              <span>
                <IconButton 
                  color="primary" 
                  onClick={onTrainStep}
                  disabled={isTraining}
                  size="small"
                  aria-label="train one step"
                >
                  <PlayArrow />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Train to completion" placement="bottom" TransitionComponent={Zoom}>
              <span>
                <IconButton 
                  color="primary" 
                  onClick={onTrainToEnd}
                  disabled={isTraining}
                  size="small"
                  aria-label="train to end"
                >
                  <FastForward />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Pause training" placement="bottom" TransitionComponent={Zoom}>
              <span>
                <IconButton 
                  color="primary" 
                  onClick={onPause}
                  disabled={!isTraining}
                  size="small"
                  aria-label="pause training"
                >
                  <Pause />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Save model" placement="bottom" TransitionComponent={Zoom}>
              <IconButton 
                color="secondary" 
                onClick={onSave}
                size="small"
                aria-label="save model"
              >
                <Save />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Load model" placement="bottom" TransitionComponent={Zoom}>
              <IconButton 
                color="secondary" 
                onClick={onLoad}
                size="small"
                aria-label="load model"
              >
                <Upload />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}