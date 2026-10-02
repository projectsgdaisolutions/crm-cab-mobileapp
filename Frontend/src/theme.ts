export const colors = {
  forest: '#1E2433',
  forestDeep: '#151A28',
  canopy: '#5B4FE8',
  cream: '#F4F6FB',
  paper: '#FFFFFF',
  ink: '#1B2030',
  muted: '#8B91A1',
  faint: '#A0A6B5',
  line: '#E7E9F2',
  saffron: '#5C52E8',
  saffronDeep: '#4338CA',
  clay: '#C24545',
  moss: '#1FA971',
  mossWash: '#E5F8EF',
  gold: '#C47A2C',
  goldWash: '#FFF1E0',
  blue: '#6D5BD0',
  blueWash: '#EEEAFE',
  clayWash: '#FDECEC',
  white: '#FFFFFF',
  mint: '#DDF6EA',
  hero: '#1B2340',
  phone: '#1FA971',
};

export const fonts = {
  display: 'Manrope_700Bold',
  displaySoft: 'Manrope_700Bold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
};

export function toneFor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'Active':
    case 'Answered':
    case 'Completed':
    case 'Converted':
    case 'Paid':
    case 'Confirmed':
    case 'Assigned':
    case 'available':
    case 'uploaded':
    case 'synced':
    case 'Contacted':
      return { bg: colors.mossWash, fg: colors.moss };
    case 'VIP':
    case 'High':
    case 'Interested':
    case 'Booking Confirmed':
    case 'Partial':
      return { bg: '#EEEAFE', fg: '#6D5BD0' };
    case 'Follow-up':
    case 'Contacted':
      return { bg: '#FFF1E0', fg: '#C47A2C' };
    case 'Missed':
    case 'Lost':
    case 'Cancelled':
    case 'Failed':
    case 'failed':
    case 'Inactive':
    case 'overdue':
    case 'unavailable':
      return { bg: colors.clayWash, fg: colors.clay };
    case 'New':
    case 'Enquiry':
    case 'Pending':
    case 'Busy':
    case 'local':
    case 'Rescheduled':
    case 'Unpaid':
    case 'uploading':
      return { bg: colors.blueWash, fg: colors.blue };
    default:
      return { bg: '#EFEAE2', fg: '#5C564E' };
  }
}
