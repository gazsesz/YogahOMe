import { ScrollView } from 'react-native';
import { DisclaimerText } from '../components/Disclaimer';
import { C, WIDE } from '../lib/theme';

/** A felelősségi nyilatkozat újraolvasása a főoldalról. */
export default function DisclaimerScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[{ padding: 20 }, WIDE]}>
      <DisclaimerText />
    </ScrollView>
  );
}
