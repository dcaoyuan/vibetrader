import './App.css'
import { Provider, } from '@react-spectrum/s2';
import { BrowserRouter, useNavigate, useHref, type NavigateOptions, Routes, Route } from 'react-router';
import '@react-spectrum/s2/page.css';

import HomePage from './lib/layouts/HomePage'
import { useState } from 'react';

// Configure the type of the `routerOptions` prop on all React Spectrum components.
declare module '@react-spectrum/s2' {
    interface RouterConfig {
        routerOptions: NavigateOptions
    }
}

const getMatches = (query: string) => window.matchMedia(query).matches;

function App() {
    const navigate = useNavigate()

    const systemScheme = getMatches('(prefers-color-scheme: dark)') ? 'dark' : 'light';

    const [colorTheme, setColorTheme] = useState(systemScheme);

    const toggleColorTheme = () => {
        switch (colorTheme) {
            case 'light':
                setColorTheme('dark');
                break;

            case 'dark':
                setColorTheme('light');
                break;
        }
    }

    return (
        <Provider colorScheme={colorTheme as 'light' | 'dark'} background="base" router={{ navigate, useHref }} >
            {/* Color Theme Selector */}
            <div>
                <select hidden id="color-scheme" value={colorTheme} onChange={() => { }}>
                    <option value="system">System</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </select>
            </div>

            <Routes>
                <Route path="/vibetrader" element={
                    <HomePage toggleColorTheme={toggleColorTheme} colorTheme={colorTheme as 'light' | 'dark'} />
                } />
            </Routes>
        </Provider>
    )
}

export default App
