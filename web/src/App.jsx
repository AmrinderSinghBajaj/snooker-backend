import NavBar from './components/NavBar'
import Footer from './components/Footer'
import Hero from './sections/Hero'
import FeatureOverviewStrip from './sections/FeatureOverviewStrip'
import TableManagement from './sections/TableManagement'
import Billing from './sections/Billing'
import RevenueAnalytics from './sections/RevenueAnalytics'
import FoodAndDrink from './sections/FoodAndDrink'
import Memberships from './sections/Memberships'
import CustomersStaffWallet from './sections/CustomersStaffWallet'
import MultiClubSuperadmin from './sections/MultiClubSuperadmin'
import SignatureExperience from './sections/SignatureExperience'
import CTASection from './sections/CTASection'
import Contact from './sections/Contact'

export default function App() {
  return (
    <div className="bg-ink min-h-screen">
      <NavBar />
      <main>
        <Hero />
        <FeatureOverviewStrip />
        <TableManagement />
        <Billing />
        <RevenueAnalytics />
        <FoodAndDrink />
        <Memberships />
        <CustomersStaffWallet />
        <MultiClubSuperadmin />
        <SignatureExperience />
        <CTASection />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
