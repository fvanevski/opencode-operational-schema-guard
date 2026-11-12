import importlib.util
import os
import fcntl
import pathlib
import tempfile
import unittest

here=pathlib.Path(__file__).with_name('ex_admitted_node_bridge.py')
spec=importlib.util.spec_from_file_location('ex_admitted_node_bridge',here)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class BridgeTest(unittest.TestCase):
    def test_inherited_fd_is_held_and_wrong_fd_or_unlocked_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=os.path.join(d,'openviking-agent.lock')
            with open(path,'a+') as f, open(path,'a+') as other:
                fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
                self.assertTrue(module._held_parent_flock(f.fileno(),path))
                self.assertFalse(module._held_parent_flock(other.fileno(),path))
                self.assertFalse(module._held_parent_flock(f.fileno(),path+'-wrong'))
                fcntl.flock(f,fcntl.LOCK_UN)
                self.assertFalse(module._held_parent_flock(f.fileno(),path))

if __name__=='__main__':
    unittest.main()
