
import AuthWrapper from "@/app/components/AuthWrapper";
import ImportRedirect from './components/ImportRedirect';


export default function Home() {
  return (
    <AuthWrapper>
      <ImportRedirect />
    </AuthWrapper>
  );
}
