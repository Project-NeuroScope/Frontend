import { Box, Typography } from '@mui/material';

export default function Header() {
    return (
        <Box sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
            <Typography variant="h5" component="h1">
                NeuralScope
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
                浏览器里的神经网络可视化工具
            </Typography>
        </Box>
    )
}