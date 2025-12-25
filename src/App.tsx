import './App.css'
import { Provider } from '@react-spectrum/s2';
import { BrowserRouter, useNavigate, useHref, type NavigateOptions, Routes, Route } from 'react-router';
import '@react-spectrum/s2/page.css';

import HomePage from './lib/layouts/HomePage'

// Configure the type of the `routerOptions` prop on all React Spectrum components.
declare module '@react-spectrum/s2' {
    interface RouterConfig {
        routerOptions: NavigateOptions
    }
}

function App() {
    const navigate = useNavigate()

    return (
        // <Provider background="base" router={{ navigate, useHref }} >
        <Routes>
            <Route path="/vibetrader" element={<HomePage />} />
        </Routes>
        // </Provider>
    )
}

export default App
