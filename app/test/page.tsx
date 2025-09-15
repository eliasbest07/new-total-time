'use client';
import TimeManagementApp from "@/application/pizarra/animacion-menu-latera";
import TestPizarra from "@/application/pizarra/test-pizarra";

export default function TestPage() {
    return (
        <div>
            <h1>Test Page</h1>
            {/* <TestPizarra /> //pizarra mejorada  */}
            <TimeManagementApp />
        </div>
    );
}
