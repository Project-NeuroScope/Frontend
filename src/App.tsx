import { useState } from 'react';
import { Box, Button, Paper, Slide } from '@mui/material';
import Canvas from './components/Canvas';
import Controls from './components/Controls';

export default function App() {
    const [showControls, setShowControls] = useState(false);
    const [isTraining, setIsTraining] = useState(false);

    const toggleControls = () => {
        setShowControls(!showControls);
    };

    const handleTrainStep = () => {
        console.log('Training one step');
        // Implement single step training
    };

    const handleTrainToEnd = () => {
        setIsTraining(true);
        console.log('Training to end');
        // Implement complete training
    };

    const handlePause = () => {
        setIsTraining(false);
        console.log('Training paused');
        // Implement pause functionality
    };

    const handleSave = () => {
        console.log('Saving model');
        // Implement model saving
    };

    const handleLoad = () => {
        console.log('Loading model');
        // Implement model loading
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <Canvas />
            <Controls
                onTrainStep={handleTrainStep}
                onTrainToEnd={handleTrainToEnd}
                onPause={handlePause}
                onSave={handleSave}
                onLoad={handleLoad}
                isTraining={isTraining}
            />
        </div>
    );
}
