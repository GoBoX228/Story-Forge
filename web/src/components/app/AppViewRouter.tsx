import React from 'react';
import { AppNavigation } from '../../hooks/useAppNavigation';
import {
  AdminRoute,
  AssetsRoute,
  CampaignsRoute,
  CharactersRoute,
  DashboardRoute,
  GuideRoute,
  ItemsRoute,
  MapsRoute,
  ProfileRoute,
  ScenariosRoute,
  SettingsRoute,
  ThemeName
} from './AppRouteViews';

interface AppViewRouterProps {
  navigation: AppNavigation;
  interfaceScale: number;
  setInterfaceScale: (scale: number) => void;
  currentTheme: ThemeName;
  setCurrentTheme: (theme: ThemeName) => void;
}

export const AppViewRouter: React.FC<AppViewRouterProps> = ({
  navigation,
  interfaceScale,
  setInterfaceScale,
  currentTheme,
  setCurrentTheme
}) => (
  <div key={navigation.activeView} className="h-full w-full animate-fade-in">
    {(() => {
      switch (navigation.activeView) {
        case 'dashboard':
          return <DashboardRoute navigation={navigation} />;
        case 'campaigns':
          return <CampaignsRoute navigation={navigation} />;
        case 'scenarios':
          return <ScenariosRoute navigation={navigation} />;
        case 'maps':
          return <MapsRoute navigation={navigation} />;
        case 'items':
          return <ItemsRoute navigation={navigation} />;
        case 'characters':
          return <CharactersRoute navigation={navigation} />;
        case 'assets':
          return <AssetsRoute navigation={navigation} />;
        case 'profile':
          return <ProfileRoute />;
        case 'settings':
          return (
            <SettingsRoute
              interfaceScale={interfaceScale}
              setInterfaceScale={setInterfaceScale}
              currentTheme={currentTheme}
              setCurrentTheme={setCurrentTheme}
            />
          );
        case 'guide':
          return <GuideRoute />;
        case 'admin':
          return <AdminRoute navigation={navigation} />;
        default:
          return <DashboardRoute navigation={navigation} />;
      }
    })()}
  </div>
);
