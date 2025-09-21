
import AuthWrapper from "@/app/components/AuthWrapper";
import MainScreen from './components/MainScreen';


export default function Home() {
  return (
    <AuthWrapper>
      <MainScreen />
    </AuthWrapper>
  );
}
