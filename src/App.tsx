import './App.css'
import { Provider, } from '@react-spectrum/s2';
import { useNavigate, useHref, type NavigateOptions, Routes, Route } from 'react-router';
import '@react-spectrum/s2/page.css';

import HomePage from './lib/layouts/HomePage'
import { useState } from 'react';

// Configure the type of the `routerOptions` prop on all React Spectrum components.
declare module '@react-spectrum/s2' {
    interface RouterConfig {
        routerOptions: NavigateOptions
    }
}

export type ColorScheme = 'light' | 'dark'

const getMatches = (query: string) => window.matchMedia(query).matches;

function App() {
    const navigate = useNavigate()

    const systemScheme = getMatches('(prefers-color-scheme: dark)') ? 'dark' : 'light';

    const [colorScheme, setColorScheme] = useState(systemScheme);

    const toggleColorTheme = () => {
        switch (colorScheme) {
            case 'light':
                setColorScheme('dark');
                break;

            case 'dark':
                setColorScheme('light');
                break;
        }
    }

    return (
        <Provider colorScheme={colorScheme as 'light' | 'dark'} background="base" router={{ navigate, useHref }} >
            {/* Color Theme Selector */}
            <div>
                <select hidden id="color-scheme" value={colorScheme} onChange={() => { }}>
                    <option value="system">System</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </select>
            </div>

            <Routes>
                <Route path="/" element={
                    <HomePage toggleColorScheme={toggleColorTheme} colorScheme={colorScheme} />
                } />
                <Route path="/vibetrader" element={
                    <HomePage toggleColorScheme={toggleColorTheme} colorScheme={colorScheme} />
                } />
            </Routes>
        </Provider>
    )
}

export default App
