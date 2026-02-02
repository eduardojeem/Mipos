'use client';

import { useState } from 'react';
import './landing.css';
import {
    LandingHeader,
    HeroSection,
    HowItWorksSection,
    TrustedBusinesses,
    PricingSection,
    RegistrationSection,
    Footer
} from './components';

export default function InicioPage() {
    const [selectedPlan, setSelectedPlan] = useState<{
        id: string;
        name: string;
        slug: string;
        priceMonthly: number;
        priceYearly: number;
    } | null>(null);

    const handlePlanSelect = (plan: any) => {
        setSelectedPlan(plan);
        // Scroll suave a la sección de registro
        const registrationSection = document.getElementById('registro');
        if (registrationSection) {
            registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleRegistrationSuccess = () => {
        // Redirigir a la página de onboarding
        window.location.href = '/onboarding';
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <LandingHeader />

            <main>
                <HeroSection />

                <HowItWorksSection />

                <TrustedBusinesses />

                <PricingSection
                    onPlanSelect={handlePlanSelect}
                    selectedPlanId={selectedPlan?.id}
                />

                {selectedPlan && (
                    <RegistrationSection
                        selectedPlan={selectedPlan}
                        onSuccess={handleRegistrationSuccess}
                    />
                )}
            </main>

            <Footer />
        </div>
    );
}
