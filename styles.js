import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const styles = StyleSheet.create({
  // container
  container: {
    flex: 1,
    padding: 20,
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 200,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },

  // header h1
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  burgerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // btn
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // input
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  inputContainer: {
    width: '100%',
    height: 55,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  noteInputInside: {
    borderRadius: 20,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
  },

  // list card
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  text: {
    fontSize: 17,
    lineHeight: 26,
  },

  // tags
  tagBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagInputSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tagLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  tagInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontWeight: 'bold',
  },

  // mondal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModal: {
    width: '85%',
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  compactModal: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  // password
  pinInputInside: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    textAlign: 'left',
  },
  eyeIcon: {
    padding: 5,
    marginLeft: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // folder
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  folderText: {
    fontSize: 18,
    fontWeight: '500',
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  folderHeaderTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  addFolderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  folderOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },

  // burger meni
  burgerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  burgerMenu: {
    width: '75%',
    height: '100%',
    padding: 25,
    paddingTop: 60,
  },
  burgerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  burgerItem: {
    marginBottom: 30,
  },
  burgerItemText: {
    fontSize: 20,
    fontWeight: '500',
  },

  // bottom bar
  bottomBar: {
    flexDirection: 'row',
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
});