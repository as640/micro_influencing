import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import AccountInfoPage from './pages/AccountInfoPage';
import BrandingPage from './pages/BrandingPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MarketingPlaceholderPage from './pages/MarketingPlaceholderPage';
import MessagesPage from './pages/MessagesPage';
import OrdersEarningsPage from './pages/OrdersEarningsPage';
import OurServicesPage from './pages/OurServicesPage';
import PendingOrdersPage from './pages/PendingOrdersPage';
import RegistrationPage from './pages/RegistrationPage';
import SignupPage from './pages/SignupPage';
import WhoWeArePage from './pages/WhoWeArePage';
import FindInfluencersPage from './pages/FindInfluencersPage';
import MyCampaignsPage from './pages/MyCampaignsPage';
import FindCampaignsPage from './pages/FindCampaignsPage';
import InstagramCallbackPage from './pages/InstagramCallbackPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<BrandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/our-work"
        element={
          <MarketingPlaceholderPage
            title="Our Work"
            description="This page will showcase case studies, campaign outcomes, creator collaborations, and impact metrics."
          />
        }
      />
      <Route path="/our-services" element={<OurServicesPage />} />
      <Route path="/who-we-are" element={<WhoWeArePage />} />
      <Route path="/registration" element={<RegistrationPage />} />
      <Route
        path="/insights"
        element={
          <MarketingPlaceholderPage
            title="Insights"
            description="This page will feature articles, trends, creator economy updates, and practical growth insights from campaigns."
          />
        }
      />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="account" element={<AccountInfoPage />} />
        <Route path="orders" element={<OrdersEarningsPage />} />
        <Route path="pending-orders" element={<PendingOrdersPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="find-influencers" element={<FindInfluencersPage />} />
        <Route path="my-campaigns" element={<MyCampaignsPage />} />
        <Route path="find-campaigns" element={<FindCampaignsPage />} />
      </Route>

      {/* Verification Engine OAuth Callback */}
      <Route path="/instagram/callback" element={<InstagramCallbackPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
