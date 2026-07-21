/**
 * HelpModalHost
 *
 * Mount inside a native-Modal sheet that contains InfoButtons, so the help
 * Modal presents above the sheet: iOS silently drops a sibling Modal's
 * presentation while another native Modal is open, so help must mount inside
 * the open sheet's own hierarchy. While any host is mounted, GlobalSheets
 * yields help presentation to it.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { registerHelpModalHost, unregisterHelpModalHost } from '@/store';
import { HelpModal } from './HelpModal';

export const HelpModalHost: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(registerHelpModalHost());
    return () => {
      dispatch(unregisterHelpModalHost());
    };
  }, [dispatch]);

  return <HelpModal />;
};

export default HelpModalHost;
